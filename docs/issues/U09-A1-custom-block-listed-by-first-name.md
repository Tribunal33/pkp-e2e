# Managers see custom blocks listed by a lower-case id from their first title, ignoring title changes

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/customBlockManager#66` for `pkp/pkp-lib#5619` · [0d29bdac28](https://github.com/pkp/customBlockManager/commit/0d29bdac28eeb4dfbc2b04da8fe1f2e8ce759f0b) · 2020-11-12 · Nate Wright (NateWr)
- **Upstream** `pkp/customBlockManager#17` (open), which asks for the list to show the title; `pkp/pkp-lib#11863` (open), whose second item reports that a changed title is not followed
- **Tracked in** spec U09 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager who types "Our Partners" as a custom block's "Block Name"
expects to see "Our Partners" in the "Custom Blocks" list. They also
expect "Our Partners (Custom Block)" in the "Sidebar" list, on
Settings › Website › "Appearance" › "Setup". Instead the block is shown
as "our-partners", and as "our-partners (Custom Block)" under
"Sidebar". Once the "Block Name" is changed to "Friends", both still
read "our-partners", while the public pages show "Friends". Before the
"Block Name" became a title in 3.3, managers typed this id themselves,
so both lists showed what they had typed.

Every task still gets done. But a manager with several blocks has to
open each one with "Edit" to tell which is which. Deleting the block and
adding it again under the new title does not help either. On
PostgreSQL, "Delete" fails. On MySQL, it costs the block's content and
its place in the sidebar.

## Impact

- **Lost.** Nothing is stored wrong.
- **Who.** Journal, press and server managers who use custom blocks,
  each time they manage or place one.
- **Way round.** "Edit" on a row shows the block's "Block Name".

Low: the list and the "Sidebar" label mislead, but every task gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`). The
  steps are the same in OJS, OMP and OPS.
- The dataset leaves "Custom Block Manager" unticked and holds no
  custom block, so steps 3 to 6 turn it on and add one.

Adding:

1. Sign in as `rvaca` (the journal, press or server manager).
2. Open Settings › Website
   (`/index.php/publicknowledge/en/management/settings/website`), tab
   "Plugins".
3. Under "Installed Plugins", "Generic Plugins", tick "Custom Block
   Manager".
4. Press the arrow on its row, then "Manage Custom Blocks".
5. Press "Add Block". Type "Block Name" "Our Partners u09a1" and
   "Content" "Partner list.".
6. Press "Save" and read the "Custom Blocks" list.
7. Close the window and reload the page (the "Sidebar" list is read
   when the page loads). Open the tab "Appearance", then "Setup". Tick
   the new block under "Sidebar" and press "Save".

Changing the title:

8. Open "Plugins" again, then "Manage Custom Blocks". Press the arrow on
   the block's row, then "Edit".
9. Replace "Block Name" with "Friends u09a1", tick "Show the name of
   this block above the block content." and press "Save". Read the
   list.
10. Close the window, reload the page, open "Appearance" › "Setup" and
    read "Sidebar".
11. Open the home page (`/index.php/publicknowledge`).

**Expected.** Step 6 lists "Our Partners u09a1", and step 7 offers
"Our Partners u09a1 (Custom Block)". After the change, step 9 lists
"Friends u09a1" and step 10 reads "Friends u09a1 (Custom Block)", still
ticked. Step 11 shows "Friends u09a1" above "Partner list.".

**Observed.** Step 6 lists "our-partners-u09a1", and step 7 offers
"our-partners-u09a1 (Custom Block)". After the change, step 9 still
lists "our-partners-u09a1", and step 10 still reads
"our-partners-u09a1 (Custom Block)", ticked. Step 11 shows "Friends
u09a1" above "Partner list.", so the public page follows the change.

## Cause

Each custom block has a hidden **id**, its `plugin_name`. The block's
settings are stored under it in `plugin_settings`, and the "Sidebar"
setting stores it to place the block. The "Block Name" the manager
types is the block's title, stored per language as its `blockTitle`
setting.

`CustomBlockForm::execute()` makes the id once, when the block is first
saved, from the title in the manager's interface language
([`controllers/grid/form/CustomBlockForm.php` line 105](https://github.com/pkp/customBlockManager/blob/1f8d452d8c5e67d073a72f61eab39b97838d87b2/controllers/grid/form/CustomBlockForm.php#L105),
`Str::of(…)->lower()->kebab()`). An edit saves the new `blockTitle` and
keeps the id, as it must: changing the id would move the block's
settings and its place in the sidebar.

The fault is that the two screens a manager uses show the id instead
of the title:

- **The "Custom Blocks" list.** `CustomBlockGridHandler::initialize()`
  fills the "Block Name" column with the id
  ([`controllers/grid/CustomBlockGridHandler.php` line 95](https://github.com/pkp/customBlockManager/blob/1f8d452d8c5e67d073a72f61eab39b97838d87b2/controllers/grid/CustomBlockGridHandler.php#L95),
  `'title' => $block`).
- **The "Sidebar" label.** `CustomBlockPlugin::getDisplayName()` returns
  the id followed by " (Custom Block)"
  ([`CustomBlockPlugin.php` line 107](https://github.com/pkp/customBlockManager/blob/1f8d452d8c5e67d073a72f61eab39b97838d87b2/CustomBlockPlugin.php#L107)).
  pkp-lib's `PKPAppearanceSetupForm` and `PKPSiteAppearanceForm` label
  each block plugin under "Sidebar" with `getDisplayName()`, so this
  form of the id shows only there.

Before `pkp/pkp-lib#5619`, the manager typed the id itself, using only
letters, digits, "-" and "_". Both screens showed what they had typed.
That change turned "Block Name" into a multilingual title, shown as the
block's heading, and made the id from it, "so that the user doesn't
ever have to enter it" (the issue's words). The list and the label kept
showing the id.

`Str::kebab()` joins the words and puts "-" only before a word whose
first letter it can capitalise (a to z). So "Événements à venir" gets
the id "événementsà-venir": the words run together when the id is made,
and this fault puts that id on screen. The cleaning that lets "&" into
the id is a separate fault, reported in
[U09-A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A13-custom-block-ampersand-name-stuck.md).

Reach:

- **The public pages.** They follow a changed title, as the walk
  showed: `CustomBlockPlugin::getContents()` picks the title in the
  visitor's language, else the primary language.
- **The site's own blocks.** Administration › "Site Settings" offers
  them on a site hosting more than one context. The code shows they use
  the same list and `getDisplayName()`.
- **Blocks from before 3.3.** In the code, the 3.3 upgrade
  (`PKPv3_3_0UpgradeMigration::_createCustomBlockTitles()`) copied each
  id into `blockTitle` in the primary language. So these blocks show the
  same text until someone changes the title.

## Proposed fix

In pkp/customBlockManager, show the block's title where the id is shown
today, and keep the id hidden. Add
`CustomBlockPlugin::getLocalizedTitle()`. It picks the title the way
`getContents()` picks the heading (the current language, else the
primary language) and falls back on the id when both are empty. Use it
in `getDisplayName()` and in the grid's "Block Name" column:

```diff
     public function getDisplayName()
     {
-        return $this->_blockName . ' ' . __('plugins.generic.customBlock.nameSuffix');
+        return $this->getLocalizedTitle() . ' ' . __('plugins.generic.customBlock.nameSuffix');
+    }
+
+    public function getLocalizedTitle(): string
+    {
+        $request = Application::get()->getRequest();
+        $context = $request->getContext();
+        $primaryLocale = $context ? $context->getPrimaryLocale() : $request->getSite()?->getPrimaryLocale();
+        $titles = (array) $this->getSetting($this->getCurrentContextId(), 'blockTitle');
+        return ($titles[Locale::getLocale()] ?? '') ?: ($titles[$primaryLocale] ?? '') ?: $this->getName();
     }
```

```diff
                 $gridData[$block] = [
-                    'title' => $block
+                    'title' => (new CustomBlockPlugin($block, $customBlockManagerPlugin))->getLocalizedTitle()
                 ];
```

[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-listed-by-first-name/fix.diff)
gives its paths from the app root
(`plugins/generic/customBlockManager/…`). In a pkp/customBlockManager
clone, apply it with `git apply -p4`. It also updates the plugin's
Cypress test, which finds the block under "Sidebar" by its id
(`span:contains("test-custom-block")`).

- **Why here.** `CustomBlockPlugin` owns both the title and the display
  name, so both appearance forms follow it. The grid row keeps the id
  as its row id, so "Edit", "Delete" and the values "Sidebar" posts do
  not change.
- **Escaping.** The grid cell escapes its label. Both appearance forms
  pass `getDisplayName()` through `htmlspecialchars()`. So a title with
  "&" or "<" shows as typed.
- **Two blocks with the same title** are both listed under that title,
  as the manager typed it. Today they read "our-partners" and
  "our-partners" plus 13 generated characters, which does not tell them
  apart any better.
- **Another context's blocks.** `getLocalizedTitle()` reads `blockTitle`
  for the request's context. `CustomBlockManagerPlugin::register()`
  registers the blocks for `$mainContextId` when a caller loads the
  generic plugins for a named context. No screen in pkp-lib or the apps
  does that today: the dispatcher loads them for the request's context.
  If a caller did, the label would find no title for that context and
  show the id. That is harmless on the two appearance forms, which
  always run in their own context. Passing the registration context
  into `CustomBlockPlugin` would close the gap.

**Tried** on `main` in OJS, OMP and OPS. With the fix, the Steps show
the Expected. A second walk added two blocks with the same title, with
the fix in and then out. With the fix, the two blocks' labels showed
their title. Everything else read the same both ways:

- the ids;
- each row's "Edit", which opened its own block, and "Delete";
- placing both blocks under "Sidebar", and the home page;
- the other blocks' "Sidebar" labels.

**Alternatives**

- **Change the id on edit.** It would move the block's
  `plugin_settings` rows and its entry in every context's `sidebar`
  setting, for a value no one needs to see.
- **Generate ids apart from the title** (`pkp/customBlockManager#17`,
  PR `pkp/customBlockManager#60`, open since 2020). That hides the id
  for good, but needs a migration of every stored block. This fix gives
  managers the title without a migration, and does not stand in its
  way.
- **The grid's own multilingual column** (the `multilingual` flag in
  `gridCellContents.tpl`). The form stores an empty string for each
  language left blank. The template's `isset()` accepts that empty
  string, so a manager in such a language would see an empty cell
  instead of the primary language's title.

**What goes with it**

- **With the fix for
  [U09-A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A13-custom-block-ampersand-name-stuck.md).**
  That fix changes how `CustomBlockForm::execute()` cleans the id; this
  one changes only what is shown. The two touch different files and
  apply together. With both, a block titled "News & Events" is listed
  as "News & Events" and can be placed. With this one alone, it is
  listed as "News & Events" but stays stuck as that report describes.
- **No data repair.** Nothing stored changes.
- **A test.** The plugin's `CustomBlocks.cy.js` could change the
  block's title and check the list and "Sidebar" labels.
- **Older versions.** The diff applies to 3.5 as it stands. 3.4 takes
  the same change. 3.3 needs it in the `.inc.php` files, with
  `AppLocale::getLocale()` and without `?->`. The 3.4 and 3.3 changes
  were read, not tried.

Small: no stored data or API changes.

## Evidence

- **The kept script.**
  [`shared/playwright/checks/issues/custom-block-listed-by-first-name/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-listed-by-first-name/walk.js)
  runs on an install freshly loaded from the default dataset
  (pkp/datasets 38ab955, 2026-09-30, `pgsql`):
  `node bin/probe.js all shared/playwright/checks/issues/custom-block-listed-by-first-name/walk.js [neighbour]`.
  With no argument it takes the Steps. `neighbour` takes the two blocks
  with the same title.
- **The fix trial.**
  `node bin/try-fix.js apply shared/playwright/checks/issues/custom-block-listed-by-first-name/fix.diff ojs omp ops`,
  then both walks, then `revert` and the second walk again. The Cypress
  change was not run. The diff applies to `stable-3_5_0` as it stands
  (`patch --dry-run`); it was not walked there.
- **What was walked where.** The Steps on `main` and `stable-3_5_0`,
  OJS, OMP and OPS, with the same Observed on each.
- **Branch tips.**
  - `main`: OJS bade233f73, OMP 3b0ecf794c, OPS c8af945bb7. pkp-lib
    2e377d27fc (OJS) and 3dc90c81a6 (OMP, OPS). pkp/customBlockManager
    1f8d452d8c in all three.
  - `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd.
    pkp-lib a9c76aed62. pkp/customBlockManager 87092d8a46.
  - `stable-3_4_0`: OJS 9571d8fde7, OMP 0aec65441f, OPS acd8ae704b,
    each pinning pkp/customBlockManager 343f732568; pkp-lib df13621c2d.
  - `stable-3_3_0`: OJS 9fdb9bcf9a, OMP 8e72fc8836, OPS c5532e2161,
    each pinning pkp/customBlockManager 60eb4f04fe; pkp-lib d446601ebe.
- **The 3.4 and 3.3 code.** Both pinned plugin commits contain
  0d29bdac28 and the two lines unchanged. There the id is made with
  Stringy's `toLowerCase()->dasherize()`, so "Our Partners" also
  becomes "our-partners".
- **The Introduced trace.** Blame on the grid line and on
  `getDisplayName()` gives 496fe4e7, a PSR-12 reformatting
  (`pkp/pkp-lib#5678`). Before it, both lines date from 2014 (the
  initial commit) and 2018, when they showed the id the manager typed.
  0d29bdac28 made the id from the new title and left both lines
  unchanged.
- **Upstream**, searched 2026-09-30. `pkp/customBlockManager#17`
  (2017, before titles existed) asks to generate the id, hide it and
  show the title in the list. `pkp/pkp-lib#11863` (2025) lists "The
  name of the custom block isn't being saved" after an edit, among
  three other sidebar problems.
- **Deleting and adding again.** On PostgreSQL, "Delete" fails
  ([U09-A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A14-custom-block-delete-fails-postgresql.md)).
  On MySQL it was read in the code, not driven.
- **Not driven.** The site's own blocks: the dataset hosts one context,
  so Administration › "Site Settings" offers no "Plugins". A manager in
  the French interface, where the fix shows the French title, else the
  primary language's. 3.4 and 3.3.
