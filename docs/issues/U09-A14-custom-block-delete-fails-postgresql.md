# On PostgreSQL, a manager's "Delete" on a custom block hangs on a spinner and the block stays

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10109` for `pkp/pkp-lib#7111` · [9b81a3c3c9](https://github.com/pkp/pkp-lib/commit/9b81a3c3c941b3583ae43ff4c2f826791c778f56) · 2024-06-21 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U09 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a14)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On an installation whose database is PostgreSQL, "OK" in a custom
block's "Delete" window fails on the server: the window stays open with
a spinner and no message, and the block stays in the "Custom Block
Manager" list. "Delete" is the only way to remove a custom block, so
once made, a block cannot be removed. This holds for the blocks of a
journal, press or server and for the site's own blocks.

A manager can still keep a block off the public pages by unticking it
under "Sidebar" on the "Appearance" › "Setup" settings page.

Installations on MySQL or MariaDB are not affected. Other plugin
settings are saved and changed normally on PostgreSQL; the only other
page that removes a plugin setting the same way is a theme's settings
page when an option is emptied, which the theme shipped with the apps
does not allow.

## Impact

- **Lost.** Nothing stored is lost or changed. The manager is not told
  why the window hangs; the error is written only to the server's log.
- **Who.** Journal, press and server managers on a PostgreSQL
  installation, each time they delete a custom block. Also the site
  administrator, for the site's own blocks, which Administration › "Site
  Settings" › "Plugins" offers when the site hosts no journal or more
  than one.
- **Way round.** Untick the block under "Sidebar" and press "Save": on
  Settings › Website › "Appearance" › "Setup" for a journal's block, on
  Administration › "Site Settings" › "Appearance" › "Setup" for one of
  the site's. Readers no longer see it, but it stays in the manager's
  list, which grows with every block a manager gives up on.

Medium: removing a block fails on every PostgreSQL installation, but a
manager can hide it from readers through the settings pages. It would
be higher if the block could not be hidden.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`), on
  PostgreSQL. The steps are the same in OJS, OMP and OPS.
- The dataset leaves "Custom Block Manager" unticked and holds no custom
  block, so steps 3 to 6 turn it on and add one.

1. Sign in as `rvaca` (the journal, press or server manager).
2. Open Settings › Website
   (`/index.php/publicknowledge/en/management/settings/website`), tab
   "Plugins".
3. Under "Installed Plugins", "Generic Plugins", tick "Custom Block
   Manager". "The plugin "Custom Block Manager" has been enabled." shows
   at the top right.
4. Press the arrow on its row, then "Manage Custom Blocks". The window
   "Custom Block Manager" opens, listing no block.
5. Press "Add Block". Type "Block Name" "Partners u09a14" and "Content"
   "Our partners.".
6. Press "Save". The list shows "partners-u09a14".
7. Press the arrow on that row, then "Delete". A window "Delete" asks
   "Are you sure you wish to delete this item? This action cannot be
   undone.".
8. Press "OK".
9. Reload the page, open "Plugins" again and "Manage Custom Blocks".

**Expected.** After step 8 the "Delete" window closes and
"partners-u09a14" leaves the list. The list opened in step 9 holds no
block.

**Observed.** After step 8 the "Delete" window stays open with a spinner
and no message. The request answers HTTP 500:

```
POST /index.php/publicknowledge/$$$call$$$/plugins/generic/custom-block-manager/controllers/grid/custom-block-grid/delete-custom-block?blockName=partners-u09a14
```

The server log:

```
PHP Fatal error:  Uncaught PDOException: SQLSTATE[42703]: Undefined column: 7 ERROR:  column "plugin_Name" does not exist
Next Illuminate\Database\QueryException: SQLSTATE[42703]: Undefined column: 7 ERROR:  column "plugin_Name" does not exist
```

The list opened in step 9 still holds "partners-u09a14".

## Cause

`CustomBlockGridHandler::deleteCustomBlock()`
([customBlockManager](https://github.com/pkp/customBlockManager/blob/1f8d452d8c5e67d073a72f61eab39b97838d87b2/controllers/grid/CustomBlockGridHandler.php#L228-L253))
first removes the block's settings with
`PluginSettingsDAO::deleteSetting()`. That method's query filters on the
column `plugin_Name`
([PluginSettingsDAO.php](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/plugins/PluginSettingsDAO.php#L108-L120)):

```php
DB::table('plugin_settings')
    ->where('plugin_Name', $pluginName)
```

The column is `plugin_name`. Laravel's PostgreSQL grammar quotes the
identifier (`"plugin_Name"`), and PostgreSQL matches a quoted name with
its case, so the query fails and the request ends in an uncaught
exception before anything is deleted. MySQL and MariaDB match column
names without regard to case, so the same query succeeds there.
`deleteSettingsByPlugin()`, the next method, has the same typo.

The typo came in with the move from hand-written SQL to Laravel's query
builder in 9b81a3c3c9 (`pkp/pkp-lib#7111`, "Replace homebrew caching
with Laravel tools"). The SQL before it read `WHERE plugin_name = ?`.
Every other query in the class uses `plugin_name`.

The same fault reaches:

- The site's blocks (Administration › "Site Settings" › "Plugins",
  offered whenever the site does not host exactly one journal): the
  same handler with the site's context. Checked in the code.
- `ThemePlugin::saveOption()` calls `deleteSetting()` only when an
  option is saved as an empty string. The default theme, the only one
  shipped with the three apps, never saves one:
  `DefaultThemePlugin::saveOption()` stores an empty or invalid "Base
  colour" as null, and its other options are radio buttons and
  checkboxes. A third-party theme with a text option would fail on
  Settings › Website › "Appearance" › "Theme" when the option is
  emptied. Checked in the code.
- `deleteSettingsByPlugin()`: no caller in the three apps or their
  bundled plugins, so latent; a plugin that calls it fails on
  PostgreSQL. Checked in the code.
- No other query in the three apps, their `lib/pkp` and their bundled
  plugins names a column with a capital letter (searched in the code).

## Proposed fix

A proposal; the team decides. Name the column correctly in both
methods of pkp-lib's `classes/plugins/PluginSettingsDAO.php`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-delete-fails-postgresql/fix.diff)):

```diff
@@ public function deleteSetting(?int $contextId, string $pluginName, string $settingName): void
         DB::table('plugin_settings')
-            ->where('plugin_Name', $pluginName)
+            ->where('plugin_name', $pluginName)
             ->whereRaw('COALESCE(context_id, 0) = ?', [(int) $contextId])
             ->where('setting_name', $settingName)
             ->delete();
@@ public function deleteSettingsByPlugin(?int $contextId, string $pluginName): void
         DB::table('plugin_settings')
-            ->where('plugin_Name', $pluginName)
+            ->where('plugin_name', $pluginName)
             ->whereRaw('COALESCE(context_id, 0) = ?', [(int) $contextId])
             ->delete();
```

The rule lives in the shared DAO, so the fix there covers the custom
block handler, `ThemePlugin::saveOption()` and any plugin that calls
either method. It matches `getPluginSettings()` and `updateSetting()`
in the same class, which already use `plugin_name`, and keeps what
9b81a3c3c9 was for (the Laravel query builder and cache).

Tried on `main` in OJS, OMP and OPS. With the fix in, "OK" closes the
"Delete" window, the request answers 200, and the list reopened after a
reload holds no block. A neighbour check added a second block and
deleted the first. With the fix in, the second block stayed in the list
with its stored settings unchanged, "Custom Block Manager" stayed
ticked, and no other plugin's stored settings changed. Without the fix,
the delete failed as in Observed.

**Alternatives**

- A guard in `deleteCustomBlock()` (catching the exception, or deleting
  the rows itself): a workaround that leaves the theme and plugin
  callers failing.

**What goes with it**

- No stored data needs repair, and nothing an API client, a plugin hook
  or another screen relies on changes.
- Backport: the diff applies to `stable-3_5_0` without edits (`patch`
  finds both hunks one line lower). 3.4 and 3.3 still use the
  hand-written SQL and are not affected.
- Separate from this fault, and not part of the fix: the handler
  deletes only `enabled`, `context`, `seq` and `blockContent`, so a
  deleted block's `blockTitle` and `showName` rows stay in
  `plugin_settings` (seen with the fix in). Calling
  `deleteSettingsByPlugin($contextId, $blockName)` in
  `deleteCustomBlock()` instead of the four `deleteSetting()` calls
  would take them too; it depends on this fix.
- Test: the plugin's own `cypress/tests/functional/CustomBlocks.cy.js`,
  which its CI runs on PostgreSQL as well as MySQL, creates and places a
  block but never deletes one. A delete step there, checking that the
  block leaves the list, is the natural regression test.
- An e2e check in pkp-e2e's U09 that deletes a custom block.

Small: one word in two lines of one shared DAO, tried, and a delete step
in the plugin's Cypress test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-delete-fails-postgresql/walk.js)
  takes the Steps on a fresh load of the default dataset and records
  each screen, the delete request's status and answer, the server log's
  lines and the block's rows in `plugin_settings`; with `neighbour` as
  its argument it takes the neighbour check:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/custom-block-delete-fails-postgresql/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix was tried with `node bin/try-fix.js apply fix.diff ojs omp ops`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs omp ops`.
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), `main` and `stable-3_5_0`, OJS, OMP
  and OPS.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
    OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2);
    pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)
    (OJS) and
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8)
    (OMP, OPS), the same `PluginSettingsDAO.php`; customBlockManager
    [1f8d452d8c](https://github.com/pkp/customBlockManager/commit/1f8d452d8c5e67d073a72f61eab39b97838d87b2).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994);
    pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1);
    customBlockManager
    [87092d8a46](https://github.com/pkp/customBlockManager/commit/87092d8a46244b31dd1e04dc4b4587622edffa29).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
    OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a);
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747);
    customBlockManager
    [343f732568](https://github.com/pkp/customBlockManager/commit/343f732568dff00d42e059cbbb282809a8c071b7).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
    OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09);
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072);
    customBlockManager
    [60eb4f04fe](https://github.com/pkp/customBlockManager/commit/60eb4f04fec33a383735e9eb1a58e2bc36672d94).
- Code read on 3.5: `PluginSettingsDAO::deleteSetting()` and
  `deleteSettingsByPlugin()` filter on `plugin_Name` as on `main`.
- Introduced: the GitHub API lists `pkp/pkp-lib#10109` (merged
  2024-06-26) for 9b81a3c3c9. The first release holding it is
  `3_5_0-0`; the release candidate `3_5_0rc2` already has it.
- Upstream: searched 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops, pkp/ui-library and pkp/customBlockManager, by the symptom's
  words and by `plugin_Name`, `PluginSettingsDAO`, `deleteSetting` and
  `deleteSettingsByPlugin`.
- Not driven: MySQL and MariaDB; the site's blocks (the default dataset
  hosts exactly one journal, so the site offers no "Plugins" tab); a
  theme with a text option; 3.4 and 3.3 (code only).
