# Plugins: an upgrade whose database step fails deletes the plugin, old version included, from every journal

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; a failed upgrade leaves the new version's files in place)
- **Introduced** `pkp/pkp-lib#8746` for `pkp/pkp-lib#8723` · [feac297ecf](https://github.com/pkp/pkp-lib/commit/feac297ecfc22f738f1a7e4f1bba1ff940640b18) · 2023-03-06 · Jonas Raoni Soares da Silva (jonasraoni)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U62 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a Site Administrator upgrades a plugin and the new version's own
upgrade step fails (a database change that does not fit the install),
the notice says "Upgrade failed." but does not say that the plugin is
gone. The old version's files are deleted along with the new ones, and
the plugin leaves every journal's plugin list at once and stops working
everywhere.

The installation still records the old version as installed and
enabled. Uploading that same old version through "Upload A New Plugin"
brings the plugin back, but only if the administrator still has its
package. Until then, each request to the site writes an error to the
server's log.

## Impact

- **Lost**: a plugin that was working, on every journal, press or
  server of the installation, at once.
- **Who**: the Site Administrator, upgrading through a plugin's
  "Upgrade" or the Plugin Gallery's "Upgrade". The upgrade step fails
  only when a release is broken, or when its migration does not fit the
  install's database (another database engine, data an older version
  left behind), so this is rare.
- **Way round**: only with the package of the version that was
  installed, uploaded through "Upload A New Plugin". Without that file
  there is none on screen: the Plugin Gallery offers only the newest
  release, and a package older than the recorded version is refused as
  a downgrade. The re-uploaded old version finds the database as it was
  before the upgrade, as far as the release can undo its own changes:
  the installer reverts the failed step's earlier migrations through
  their `down()`.

Medium: a rarely met failure, with a way round when the old package is
at hand. The plugin goes without warning, so a plugin the journals
cannot do without (the theme in use, a payment method), with no copy
of its package, would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- Two packages of one small generic plugin on the computer, as
  `.tar.gz` files, each holding a folder `u62g3test/` with:
  - `version.xml`: `<application>u62g3test</application>`,
    `<type>plugins.generic</type>`, `<release>` as below,
    `<lazy-load>1</lazy-load>`, `<class>U62g3testPlugin</class>`;
  - `U62g3testPlugin.php`: class
    `APP\plugins\generic\u62g3test\U62g3testPlugin extends
    PKP\plugins\GenericPlugin`, whose `getDisplayName()` returns
    "U62g3 Test Plugin" and `getDescription()` "U62g3 scratch plugin,
    version 1.0.0.0." (1.0.1.0 in the second package);
  - `index.php`: `return new
    \APP\plugins\generic\u62g3test\U62g3testPlugin();` after requiring
    the class file.

  The two packages:
  - `u62g3test-1.0.0.0.tar.gz`, `<release>1.0.0.0</release>`;
  - `u62g3test-1.0.1.0-failing.tar.gz`, `<release>1.0.1.0</release>`,
    with two more files: `upgrade.xml`

    ```xml
    <install version="1.0.1.0">
        <migration class="APP\plugins\generic\u62g3test\U62g3testPluginUpgradeMigration" />
    </install>
    ```

    and `U62g3testPluginUpgradeMigration.php`, a migration that adds a
    column to a table the install does not have:

    ```php
    namespace APP\plugins\generic\u62g3test;

    use Illuminate\Database\Migrations\Migration;
    use Illuminate\Database\Schema\Blueprint;
    use Illuminate\Support\Facades\Schema;

    class U62g3testPluginUpgradeMigration extends Migration
    {
        public function up(): void
        {
            Schema::table('u62g3test_items', function (Blueprint $table) {
                $table->string('note')->nullable();
            });
        }

        public function down(): void
        {
        }
    }
    ```

  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/failed-upgrade-removes-plugin/lib.js)
  builds both (`buildPackages()`).

Steps:

1. Sign in as `admin`.
2. Open Settings › Website
   (`/index.php/publicknowledge/management/settings/website`) and its
   "Plugins" tab.
3. Press "Upload A New Plugin", press "Upload File", choose
   `u62g3test-1.0.0.0.tar.gz` and press "Save". The notice reads
   "Successfully installed version 1.0.0.0".
4. Tick the "U62g3 Test Plugin" box under "Generic Plugins". The notice
   reads "The plugin "U62g3 Test Plugin" has been enabled."
5. Press the row's arrow, then "Upgrade". In the "Upgrade Plugin"
   window, press "Upload File", choose
   `u62g3test-1.0.1.0-failing.tar.gz` and press "Save".
6. Reload the page and open "Plugins" again.
7. Press "Upload A New Plugin" and "Save" `u62g3test-1.0.0.0.tar.gz`
   again.

**Expected**: step 5 reports the failure, and "U62g3 Test Plugin"
stays listed, ticked, with the description "U62g3 scratch plugin,
version 1.0.0.0.", at step 5 and after the reload at step 6.

**Observed**: step 5 closes the window and shows the notice

```
Upgrade failed. DB: SQLSTATE[42P01]: Undefined table: 7 ERROR: relation "u62g3test_items" does not exist (Connection: pgsql, Host: 127.0.0.1, Port: , Database: ojs_test_ds3, SQL: alter table "u62g3test_items" add column "note" varchar(255) null)
```

and "U62g3 Test Plugin" leaves the list at once; at step 6 it is still
not listed. The folder `plugins/generic/u62g3test` is gone, while the
`versions` table keeps 1.0.0.0 as the current version. From step 5 on,
every request writes to the server's log:

```
PHP Warning:  require(…/plugins/generic/u62g3test/index.php): Failed to open stream: No such file or directory in …/lib/pkp/classes/plugins/PluginRegistry.php on line 227
Instantiation of the plugin generic/u62g3test has failed
Error: Failed opening required '…/plugins/generic/u62g3test/index.php' (include_path='.:/usr/share/php') in …/lib/pkp/classes/plugins/PluginRegistry.php:227
```

Step 7 shows "Successfully installed version 1.0.0.0", and the row is
back, ticked.

## Cause

`PluginHelper::upgradePlugin()` (`lib/pkp/classes/plugins/PluginHelper.php`)
deletes the installed version's folder (`rmtree($destinyPath)`) before
it copies the new version in and before the new version's
`upgrade.xml` has run. When the upgrade step then fails, the `catch`
deletes the destination again, which now holds the new files, and
rethrows. No copy of the old files is kept, so the plugin is left with
no folder, while its `versions` row and its `enabled` settings stay.
`PluginRegistry` still tries to load it on every request and fails.

Two changes combine. The early delete is the older half: it was
already there in
[cca0be2b21](https://github.com/pkp/pkp-lib/commit/cca0be2b21ff350c4c305d7487ffa52bbb8b8334)
(2012). Up to 3.3, nothing ran after a failed step, so the new files
stayed in the folder: the plugin stayed listed, enabled and loaded, at
the old recorded version, running the new code. feac297ecf (3.4.0) added
the `catch`, so that a failed upgrade no longer leaves that
half-installed new version behind. That was right, but with the old
files already deleted, the `catch` leaves none.

Reach:

- A plugin's "Upgrade" on a context's Settings › Website (walked) and
  on Administration › Site Settings and the Settings Wizard's lists,
  which open the same form (code).
- The Plugin Gallery's "Upgrade" calls the same method with the
  downloaded release (`PluginGalleryGridHandler::installPlugin()`)
  (code).
- Other failures after the delete:
  - an upgrade step that returns `false` or throws: the same end;
  - a failed copy of the new files: its exception is thrown before the
    `try`, so the folder is left empty or half copied, and nothing
    cleans it up;
  - a partial delete that trips the "deleteError" check: part of the
    old folder is left (code).
- `installPlugin()` deletes only what it copied, and refuses an
  installed plugin whose folder exists, so it has no such fault (code).
- A plugin without files is not listed, so it cannot be upgraded or
  deleted from its row. `pkp/pkp-lib#9573` (open) asks for such plugins
  to be shown with those actions; it covers the state this fault leaves,
  not its cause.

## Proposed fix

Keep a copy of the installed folder until the upgrade has succeeded,
and put it back in the `catch`; when the copy back fails, keep the copy
and log where it is:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/failed-upgrade-removes-plugin/fix.diff).

```diff
+use Illuminate\Filesystem\Filesystem;
…
             $destinyPath = Core::getBaseDir() . "/plugins/{$category}/{$plugin}";
 
-            // Delete existing files.
-            $fileManager->rmtree($destinyPath);
-
-            // Check whether deleting has worked.
+            // Keep a copy of the installed version, to put back if the upgrade fails.
+            // Filesystem::copyDirectory() reports a failed copy of any file.
+            $filesystem = new Filesystem();
+            $backupPath = null;
             if (is_dir($destinyPath)) {
-                throw new Exception(__('manager.plugins.deleteError', ['pluginName' => $pluginVersion->getProduct()]));
+                $backupPath = rtrim(sys_get_temp_dir(), '\\/') . "/{$plugin}" . substr(md5(random_int(0, PHP_INT_MAX)), 0, 10);
+                if (!$filesystem->copyDirectory($destinyPath, $backupPath)) {
+                    $fileManager->rmtree($backupPath);
+                    throw new Exception('Could not back up the installed plugin!');
+                }
             }
 
-            // Copy the plug-in from the temporary folder to the target folder.
-            $fileManager->copyDir($pluginFolder, $destinyPath) || throw new Exception('Could not copy plugin to destination!');
-
             try {
+                // Delete existing files.
+                $fileManager->rmtree($destinyPath);
+
+                // Check whether deleting has worked.
+                if (is_dir($destinyPath)) {
+                    throw new Exception(__('manager.plugins.deleteError', ['pluginName' => $pluginVersion->getProduct()]));
+                }
+
+                // Copy the plug-in from the temporary folder to the target folder.
+                $fileManager->copyDir($pluginFolder, $destinyPath) || throw new Exception('Could not copy plugin to destination!');
+
                 $upgradeFile = "{$destinyPath}/" . static::PLUGIN_UPGRADE_FILE;
…
+                if ($backupPath) {
+                    $fileManager->rmtree($backupPath);
+                }
                 return $pluginVersion;
             } catch (Throwable $e) {
-                // Delete the plugin files on failure
+                // Replace the new files with the installed version's
                 $fileManager->rmtree($destinyPath);
+                if ($backupPath) {
+                    if ($filesystem->copyDirectory($backupPath, $destinyPath)) {
+                        $fileManager->rmtree($backupPath);
+                    } else {
+                        error_log("The upgrade of the plugin {$category}/{$plugin} failed and its installed version could not be restored to {$destinyPath}; its files are kept in {$backupPath}");
+                    }
+                }
                 throw $e;
             }
```

Tried on `main`, OJS, OMP and OPS: step 5 shows the same "Upgrade
failed. DB: …" notice, and "U62g3 Test Plugin" stays listed, ticked,
with "version 1.0.0.0." in its description, at step 5 and after the
reload. Its folder holds 1.0.0.0, the `versions` table still has
1.0.0.0 current, nothing is written to the server's log, and no copy is
left in the temporary folder. Step 7 then answers "Plugin already
installed and up-to-date.", as for any installed plugin. A control run,
a successful "Upgrade" from 1.0.0.0 to a 1.0.1.0 without an upgrade
step, read the same with and without the fix: "Successfully upgraded to
version 1.0.1.0", the row ticked and at 1.0.1.0 after a reload.

The copy follows `extractPlugin()` in the same class: a folder with a
random name under `sys_get_temp_dir()`, never under `plugins/`. It uses
Laravel's `Filesystem::copyDirectory()` (registered by `PKPContainer`)
rather than `FileManager::copyDir()`, because `copyDir()` ignores a
failed file copy and returns true whenever the destination folder
exists, so it cannot tell a partial backup or a partial restore. Copying
rather than renaming also works when the temporary folder is on another
file system. The fix keeps what `pkp/pkp-lib#8723` wanted: the new
files are still removed on failure.

**Alternatives**:

- Rename the installed folder aside within `plugins/<category>/`:
  cheaper, but a request listing the plugins meanwhile meets a folder
  whose name is not a plugin's, and `PluginRegistry::instantiatePlugin()`
  throws on it.
- Run the upgrade step before replacing the files: the step's
  migrations are classes in the new package's folder, autoloaded from
  `plugins/`, so the new files must be in place first.
- Make `FileManager::copyDir()` report a failed file copy: right in
  itself, but it changes a method many callers use.

**What goes with it**:

- Installations already left in this state keep a `versions` row
  without a folder; they recover as in step 7. No migration can bring
  the files back.
- Nothing an API client or a plugin hook relies on changes.
- Backport: 3.5 and 3.4 need the same change rebased. fix.diff does not
  apply to them as written: their method has no audit-log call before
  the `return`, so the second hunk is placed by hand; the rest, and
  Laravel's `Filesystem`, are there. 3.3 is not affected.
- Test: a unit test of `PluginHelper::upgradePlugin()` with a package
  whose `upgrade.xml` fails, asserting that the old folder is in place
  afterwards, or an end-to-end test that takes the same upgrade through
  a row's "Upgrade".

Small: one method, following a pattern the class already uses, and one
test.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/failed-upgrade-removes-plugin/walk.js)
  takes steps 1–7 on OJS, OMP and OPS; with `neighbour` it takes the
  fix's control run (a successful upgrade). Each run starts from an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/failed-upgrade-removes-plugin/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- PostgreSQL; MySQL not checked. The fault does not depend on the
  database, only the failing step's message does. Datasets:
  pkp/datasets c657990 (2026-10-01).
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  091fb65453, OMP 9c5e24246c, OPS 38b61882d3; pkp-lib cf3f984335. 3.4:
  OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b; pkp-lib 32b0f4b4af.
  3.3: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161; pkp-lib
  f6ab331645.
- Code reads: pkp-lib's `classes/plugins/PluginHelper.php` on 3.4 (the
  same early delete and `catch`; feac297ecf is on the branch) and
  `classes/plugins/PluginHelper.inc.php` on 3.3 (no `try`), with
  `PluginRegistry`'s loading on each.
- Not tried: a restore that fails (the logged branch of the fix); no
  screen can make a copy fail.
- Not walked: the Plugin Gallery's "Upgrade"; the lists of
  Administration › Site Settings and the Settings Wizard (the default
  dataset's single context leaves the site without a "Plugins" tab);
  what a journal shows when its theme is lost this way.
