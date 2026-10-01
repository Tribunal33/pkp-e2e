# Custom blocks are listed by a lower-case name built from their first "Block Name", even after a rename

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/customBlockManager#66` for `pkp/pkp-lib#5619` · [0d29bdac28](https://github.com/pkp/customBlockManager/commit/0d29bdac28eeb4dfbc2b04da8fe1f2e8ce759f0b) · committed 2020-11-12, merged 2020-11-17 · Nate Wright (NateWr)
- **Upstream**
  - `pkp/pkp-lib#11863` (open). Its second scenario is the rename.
  - `pkp/customBlockManager#17` (open). It asks for the title in the list.
- **Tracked in** spec U09 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager who types "Our Partners" as a custom block's "Block Name"
expects to find "Our Partners" in the "Custom Blocks" list and in the
"Sidebar" list on "Appearance" › "Setup", where blocks are picked for
the public pages. Instead both read "our-partners" ("our-partners
(Custom Block)"). After the block is renamed "Friends" they still read
"our-partners", while the public pages show "Friends".

Nothing is lost and the block works. But other names come out harder
to recognise ("News 2026 & Events" is listed as "news2026&-events"),
so a journal with several blocks, or with renamed ones, has to open
each block to tell which entry is which before ticking one under
"Sidebar".

## Impact

- **Lost**: the manager's time, opening blocks to find the one they
  want.
- **Who**: whoever manages the journal's (press's, server's) settings,
  each time they read the "Custom Blocks" list or "Sidebar", on any
  installation with custom blocks.
- **Way round**: press "Edit" on a row to see the block's real name.

Low: the labels mislead while every task gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. The dataset has "Custom Block
  Manager" unticked and no custom block.

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal manager
   (press manager, preprint server manager).
2. Open Settings › Website › "Plugins" › "Installed Plugins". Under
   "Generic Plugins", tick "Custom Block Manager".
3. Press the row's arrow, then "Manage Custom Blocks".
4. Press "Add Block". Type "Our Partners" in "Block Name" and "Partner
   list" in "Content", then press "Save". Read the "Custom Blocks" list.
5. Close the window and open Settings › Website again (the "Sidebar"
   list is built when the page loads). Open "Appearance" › "Setup",
   read the block's entry under "Sidebar", tick it and press "Save".
6. Open "Plugins" › "Manage Custom Blocks" again. Press the block's
   arrow, then "Edit"; change "Block Name" to "Friends" and press
   "Save". Read the list.
7. Close the window and open Settings › Website again. Read the block's
   entry on "Appearance" › "Setup" › "Sidebar". Open the home page
   signed out.

**Expected**: step 4 lists "Our Partners" and step 5 offers "Our
Partners (Custom Block)". After step 6 the list reads "Friends", and in
step 7 "Sidebar" reads "Friends (Custom Block)", still ticked.

**Observed**: step 4 lists "our-partners" and step 5 offers
"our-partners (Custom Block)". After step 6 the list still reads
"our-partners", and in step 7 "Sidebar" reads "our-partners (Custom
Block)", ticked. The home page's sidebar shows the renamed block:
"Friends" as its heading for screen readers, and "Partner list".

## Cause

Each custom block has a name, made once from its title in the manager's
interface language when the block is first saved
(`CustomBlockForm::execute()`) and never changed: it identifies the
block in `plugin_settings` and in the context's `sidebar` setting. The
title the manager types and edits ("Block Name") is stored apart, as
the block's `blockTitle` setting, per language, and the public block
reads it (`CustomBlockPlugin::getContents()`). How that name keeps an
"&" or comes out empty is the companion report
[U09-A4-A13-custom-block-stuck-with-unusable-name.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A4-A13-custom-block-stuck-with-unusable-name.md).

Two places show the name where the manager expects the title
(pkp/customBlockManager):

- `CustomBlockGridHandler::initialize()`, line 95, fills the list's one
  column, headed "Block Name", with the name (`'title' => $block`).
- `CustomBlockPlugin::getDisplayName()`, line 107, builds the "Sidebar"
  label from the name (`$this->_blockName . ' ' . __('plugins.generic.customBlock.nameSuffix')`).

Until 0d29bdac28 the manager typed the name itself, limited to letters,
digits, "-" and "_", so the list showed what they typed. That change
(adding a title for screen readers) turned "Block Name" into a
multilingual title and made the name from it, but left the list and the
label on the name; every version from 3.3 on has it.

Reach: the site's own blocks show their name the same way, in the same
grid and in the site's "Sidebar" (`PKPSiteAppearanceForm` calls the same
`getDisplayName()`; read in the code, not driven).

## Proposed fix

Show the block's title, in the interface language or else the primary
language, in the list and in the "Sidebar" label, and keep the name as
the identifier it is
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-listed-by-made-up-name/fix.diff);
its paths are relative to the app, `plugins/generic/customBlockManager/…`,
so a PR on pkp/customBlockManager applies it with `git apply -p4`):

```diff
     public function getDisplayName()
     {
-        return $this->_blockName . ' ' . __('plugins.generic.customBlock.nameSuffix');
+        return $this->getLocalizedBlockTitle() . ' ' . __('plugins.generic.customBlock.nameSuffix');
     }
 
+    public function getLocalizedBlockTitle(): string
+    {
+        $request = Application::get()->getRequest();
+        $context = $request->getContext();
+        $contextId = $context ? $context->getId() : Application::SITE_CONTEXT_ID;
+        $contextPrimaryLocale = $context ? $context->getPrimaryLocale() : $request->getSite()->getPrimaryLocale();
+        $titles = (array) $this->getSetting($contextId, 'blockTitle');
+        return ($titles[Locale::getLocale()] ?? '') ?: ($titles[$contextPrimaryLocale] ?? '') ?: $this->_blockName;
+    }
```

and in `CustomBlockGridHandler::initialize()`:

```diff
-                    'title' => $block
+                    'title' => (new CustomBlockPlugin($block, $customBlockManagerPlugin))->getLocalizedBlockTitle()
```

The fallback is the one `getContents()` already uses for the public
block (the interface language's title, else the primary language's), so
the list, the label and the public pages read the same. A block with no
title falls back to its name. The cell template escapes the title.

Tried on `main` on the three apps: with the fix, the list showed "Our
Partners" and "Sidebar" "Our Partners (Custom Block)"; after the rename
both read "Friends", and the block stayed ticked. A check of what the
fix must leave alone, with the fix in and out: the block's entry under
"Sidebar" keeps its value "our-partners" and its place, the other
blocks' labels are the same in English and in French, and the public
pages show the same block in both languages. In the French interface, a
block with an English title only reads "Our Partners" in the list and
the label.

**Alternatives**

- Pass the title array to the grid and set the column's `multilingual`
  flag, the grid's own pattern. It covers the list only, and its
  fallback (`gridCellContents.tpl`) takes over only when a language is
  missing, not when its box was saved empty, which the block form does;
  the "Sidebar" label would still need a change.
- Rename the block when its title changes. Its place under "Sidebar"
  and its element id on the public pages (`customblock-` and the name),
  which journals' stylesheets target, depend on the name, so a rename
  would lose both.

**What goes with it**

- `getDisplayName()` now reads the request. Its callers for a block are
  the context's and the site's "Sidebar" forms (`PKPAppearanceSetupForm`,
  `PKPSiteAppearanceForm`); the Plugins list never shows custom blocks
  (`getHideManagement()`). With no context in the request it reads the
  site's titles and primary language. A block registered for another
  context outside a web request (`register()` with a `$mainContextId`)
  finds no title there and shows its name, as today (read in the code).
- The plugin's Cypress test (`cypress/tests/functional/CustomBlocks.cy.js`,
  line 44) finds the block under "Sidebar" as "test-custom-block"; with
  the fix it reads "Test Custom Block".
- Two blocks with the same title now read the same in the list (today
  the second one's name has 13 letters and digits added). Their content
  tells them apart.
- Backport: `stable-3_5_0` and `stable-3_4_0` have the same namespaced
  files and lines (the title line is 94 on 3.4); the diff applies with
  a line offset (not tried). 3.3 has `CustomBlockPlugin.inc.php` and
  `CustomBlockGridHandler.inc.php`, where the change needs `AppLocale`,
  `0` for the site's context id, and an
  `import('plugins.generic.customBlockManager.CustomBlockPlugin')` in
  `initialize()`, since that file imports the class only in its edit
  and update handlers.
- Guard: the plugin's Cypress test renaming a block and reading the
  list and "Sidebar"; and the e2e scenario in spec U09 (a **Planned**
  item).

Small: two short changes in one plugin, and a test.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-listed-by-made-up-name/walk.js),
  with its helpers in `custom-block-stuck-with-unusable-name/lib.js`;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-listed-by-made-up-name/neighbour.js)
  walks the check of what the fix leaves alone, with the fix in and
  out. On an install freshly loaded from the default dataset, from a
  pkp-e2e checkout (`<feature>` names the set of test installs, `<id>`
  the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/custom-block-listed-by-made-up-name/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/custom-block-listed-by-made-up-name/fix.diff ojs omp ops`.
- Walked on PostgreSQL. Datasets: pkp/datasets c657990 (2026-10-01).
- Not driven: the site's blocks (the dataset has one context, so
  Administration › "Site Settings" has no "Plugins" tab); the fix on
  3.5.
- Code reads. `main` and 3.5: `CustomBlockForm::execute()` (the name
  made once), `CustomBlockPlugin::getContents()` (the title's
  fallback), `PKPAppearanceSetupForm` and `PKPSiteAppearanceForm` (the
  "Sidebar" options from `getDisplayName()`), the other callers of
  `getDisplayName()` in pkp-lib, `CustomBlockManagerPlugin::register()`.
  3.4 (plugin 343f732568) and 3.3 (60eb4f04fe), read with `git show` in
  the plugin's clone: the same `'title' => $block` and
  `getDisplayName()`; 0d29bdac28 is on both.
- Introduced: `git blame` on the two lines gives a later reformatting
  commit; `git log -L` shows the list and the label showed the typed,
  validated name until 0d29bdac28 made the name from the title.
- Upstream search (pkp/pkp-lib, pkp/customBlockManager, pkp/ojs):
  "custom block" name, custom block title locale, `CustomBlockForm`.
  Read and not the same fault: `pkp/pkp-lib#6637` (a block named like
  another plugin shares its settings), `pkp/customBlockManager#60`
  (open PR, migrating old block names).
- Tips: OJS `main` 68615b5a32 with lib/pkp 25562b0e1a; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6;
  customBlockManager 1f8d452d8c in all three. `stable-3_5_0` OJS
  3517e640f2 with lib/pkp b1981810da; OMP c7b45f88ea and OPS
  8eaf899468 with lib/pkp 1fb843f491; customBlockManager 87092d8a46.
  `stable-3_4_0`: OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b,
  customBlockManager 343f732568. `stable-3_3_0`: OJS ac77c9fb35, OMP
  8e72fc8836, OPS c5532e2161, customBlockManager 60eb4f04fe.
