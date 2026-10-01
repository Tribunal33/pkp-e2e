# A custom block cannot be deleted on PostgreSQL: "OK" spins and the block stays

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the delete is a raw SQL query with the right column name)
  - 3.3: none (code; the same raw SQL query)
- **Introduced** `pkp/pkp-lib#10109` for `pkp/pkp-lib#7111` · [9b81a3c3c9](https://github.com/pkp/pkp-lib/commit/9b81a3c3c941b3583ae43ff4c2f826791c778f56) · merged 2024-06-26 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U09 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On an installation whose database is PostgreSQL, "OK" in a custom
block's "Delete" window leaves the window open with a spinner and no
message. The block stays in three places: the Custom Block Manager's
list, the sidebar on the public pages, and Settings › Website ›
"Appearance" › "Setup" › "Sidebar".

"Delete" is the only way to remove a block, both for a journal's blocks
and for the site's. A manager can still take a block off the public
pages by unticking it under "Sidebar", but it stays in the Custom Block
Manager's list for good.

## Impact

- **Lost**: no content is lost. The manager cannot remove a block they
  no longer want, and nothing tells them why "OK" does nothing.
- **Who**: whoever manages the journal's settings, on any PostgreSQL
  installation, each time they delete a custom block; the Site
  Administrator for the site's blocks. MySQL installations are not
  affected.
- **Way round**: untick the block under Settings › Website ›
  "Appearance" › "Setup" › "Sidebar", which hides it from readers.

Medium: a settings task fails with a server error on every PostgreSQL
installation, but readers can be spared the unwanted block through
"Sidebar". It would be high if PostgreSQL were the usual database for
these apps.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, on PostgreSQL. The steps are
  the same in OJS, OMP and OPS, and on `stable-3_5_0`. The dataset has
  "Custom Block Manager" unticked and no custom block, so the steps
  turn it on and make one.

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal manager
   (press manager, preprint server manager).
2. Open Settings › Website › "Plugins" › "Installed Plugins". Under
   "Generic Plugins", tick "Custom Block Manager".
3. Press the row's arrow, then "Manage Custom Blocks".
4. Press "Add Block". Type "Our Partners" in "Block Name" and "Partner
   list" in "Content", then press "Save". The list shows
   "our-partners". Close the window.
5. Open Settings › Website › "Appearance" › "Setup". Under "Sidebar",
   tick "our-partners (Custom Block)" and press "Save". The home page's
   sidebar now shows "Our Partners Partner list".
6. Back on "Plugins", open "Manage Custom Blocks" again. Press the
   "our-partners" row's arrow, then "Delete".
7. The window "Delete" asks "Are you sure you wish to delete this item?
   This action cannot be undone.". Press "OK".
8. Reload the page and open "Manage Custom Blocks" again; open the home
   page; open "Appearance" › "Setup".

**Expected**: the window closes and "our-partners" leaves the list. The
home page's sidebar no longer shows "Our Partners", and "Sidebar" no
longer lists the block.

**Observed**: the window stays open with a spinner beside "Cancel" and
no message. The delete request answers 500:

```
POST /index.php/publicknowledge/$$$call$$$/plugins/generic/custom-block-manager/controllers/grid/custom-block-grid/delete-custom-block?blockName=our-partners
→ 500
```

The server log reads:

```
PHP Fatal error:  Uncaught PDOException: SQLSTATE[42703]: Undefined column: 7 ERROR:  column "plugin_Name" does not exist
LINE 1: delete from "plugin_settings" where "plugin_Name" = $1 and C...
HINT:  Perhaps you meant to reference the column "plugin_settings.plugin_name".
```

After step 8 the block is still in all three places: the Custom Block
Manager's list shows "our-partners", the sidebar on the home page shows
"Our Partners Partner list", and Settings › Website › "Appearance" ›
"Setup" › "Sidebar" lists "our-partners (Custom Block)", ticked.

## Cause

`PluginSettingsDAO::deleteSetting()` (pkp-lib
`classes/plugins/PluginSettingsDAO.php`, line 116) filters on a column
spelled with a capital letter:

```php
DB::table('plugin_settings')
    ->where('plugin_Name', $pluginName)
```

The column is `plugin_name`. Laravel quotes identifiers on PostgreSQL,
and PostgreSQL keeps the case of a quoted name, so `"plugin_Name"` is a
column that does not exist and the query fails. MySQL compares column
names without regard to case, which is why the query works there. The
rule it breaks: a column is named as the schema names it. Every other
query in the class says `plugin_name`.

`CustomBlockGridHandler::deleteCustomBlock()` (pkp/customBlockManager)
calls `deleteSetting()` four times before it takes the block out of
the plugin's `blocks` list. The first call throws, so nothing is
deleted and the request answers 500.

The spelling came with `pkp/pkp-lib#10109` (for `pkp/pkp-lib#7111`),
which moved the class from raw SQL to Laravel's query builder so that
it could use Laravel's cache. The raw SQL it replaced said
`plugin_name`.

Reach:

- A journal's, press's or server's custom blocks: on screen, all three
  apps, `main` and 3.5.
- The site's custom blocks: the same handler makes the same call with
  the site's context (null), so their "Delete" fails the same way (read
  in the code, not driven). Their list is on Administration › "Site
  Settings" › "Plugins", which shows only on a site with more than one
  context.
- `PluginSettingsDAO::deleteSettingsByPlugin()`, line 133, has the same
  spelling. No code in pkp-lib or the three apps calls it, so it fails
  only for a plugin that does (read in the code, not driven).
- `ThemePlugin::saveOption()` calls `deleteSetting()` when a theme
  option is saved as an empty string, so on PostgreSQL that save
  fails too. None of the default theme's options sends an empty string
  (its colour is turned into null first), so only a theme with a text
  option meets it (read in the code, not driven).

## Proposed fix

Spell the column as the schema does in both methods
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-delete-fails-postgresql/fix.diff)):

```diff
         DB::table('plugin_settings')
-            ->where('plugin_Name', $pluginName)
+            ->where('plugin_name', $pluginName)
             ->whereRaw('COALESCE(context_id, 0) = ?', [(int) $contextId])
             ->where('setting_name', $settingName)
             ->delete();
@@
         DB::table('plugin_settings')
-            ->where('plugin_Name', $pluginName)
+            ->where('plugin_name', $pluginName)
             ->whereRaw('COALESCE(context_id, 0) = ?', [(int) $contextId])
             ->delete();
```

The fix goes in the shared DAO, so every caller is covered: the custom
blocks, the theme options and any plugin that deletes its settings. It
keeps what `pkp/pkp-lib#10109` was for (the query builder and the
Laravel cache).

Tried on `main` on the three apps: with the fix the Steps show the
Expected. With a second placed block "Our Events", deleting
"our-partners" leaves "Our Events" and the plugin itself untouched.

**Alternatives**

- Go back to raw SQL for the two deletes, as 3.4 had them. It works
  too, but it undoes part of what `pkp/pkp-lib#10109` changed, for no
  gain over fixing the spelling.
- Catch the error in `deleteCustomBlock()`. It would hide the failure
  and leave the block in place, and the theme options would still fail.

**What goes with it**

- No other query has the mistake: a search of pkp-lib and the three
  apps for a column name with a capital letter in a query-builder call
  finds only these two lines.
- No stored data is wrong: a failed delete leaves the block's settings
  as they were, so the blocks managers tried to delete can be deleted
  once the fix is in.
- `deleteCustomBlock()` deletes four of the block's settings and leaves
  `blockTitle` and `showName` behind (seen in the database with the fix
  in). These rows do no harm, since a later block of the same name
  overwrites them. Calling `deleteSettingsByPlugin()` there would clear
  them; that is a separate one-line change in pkp/customBlockManager,
  not needed for this fault.
- Backport: `stable-3_5_0` has the same two lines (117 and 134); the
  diff applies there with a line offset (not tried there).
- Guard: a pkp-lib unit test for `deleteSetting()` and
  `deleteSettingsByPlugin()` that runs in pkp's PostgreSQL CI job, and
  the e2e scenario for deleting a custom block in spec U09 (a
  **Planned** item).

Small: two words in one pkp-lib file, and a test.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-delete-fails-postgresql/walk.js),
  with its helpers in `lib.js` beside it.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-delete-fails-postgresql/neighbour.js)
  takes the two-block check, with the fix in and out. On an install
  freshly loaded from the default dataset, from a pkp-e2e checkout
  (`<feature>` names the set of test installs, `<id>` the output
  folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/custom-block-delete-fails-postgresql/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/custom-block-delete-fails-postgresql/fix.diff ojs omp ops`.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL.
  MySQL not checked: that it works there is read from MySQL's
  case-insensitive column names, not driven. Datasets: pkp/datasets
  c657990 (2026-10-01).
- The script also reads the install's server log after "OK"; the lines
  in Observed are from it, the same on every app and both versions.
  The spinner is from the screenshots.
- Not driven: the site's blocks (the default dataset has one context,
  so Administration › "Site Settings" shows no "Plugins" tab); a theme
  option saved empty; `deleteSettingsByPlugin()`; the fix on 3.5.
- Code reads. `main` and 3.5: `PluginSettingsDAO.php` as quoted, the
  same two lines in each app's lib/pkp, and
  `CustomBlockGridHandler::deleteCustomBlock()` calling
  `deleteSetting()` first. 3.4 (`origin/stable-3_4_0`) and 3.3
  (`origin/stable-3_3_0`): `deleteSetting()` and
  `deleteSettingsByPlugin()` run
  `DELETE FROM plugin_settings WHERE plugin_name = ? …` through
  `$this->update()`; 9b81a3c3c9 is on neither branch.
- Introduced: `git blame` on lines 116 and 133 gives 9b81a3c3c9; the
  PR is from the GitHub API's `commits/<sha>/pulls`.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/customBlockManager):
  "plugin_Name", "custom block delete", "custom block postgres",
  `deleteCustomBlock`. Read and not the same fault: `pkp/pkp-lib#6637`
  (validating a custom block's name before it is stored).
- Tips: OJS `main` 68615b5a32 with lib/pkp 25562b0e1a; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6;
  customBlockManager 1f8d452d8c in all three. `stable-3_5_0` OJS
  3517e640f2 with lib/pkp b1981810da; OMP c7b45f88ea and OPS
  8eaf899468 with lib/pkp 1fb843f491; customBlockManager 87092d8a46.
  `stable-3_4_0` lib/pkp 32b0f4b4af; `stable-3_3_0` lib/pkp f6ab331645.
