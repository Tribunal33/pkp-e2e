# Deleting a plugin: the notice that confirms it reads "successfuly deleted"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** no PR (PKP bug 3745, before GitHub) · [ab8022c5d0](https://github.com/pkp/ojs/commit/ab8022c5d04720932bd02778ee182b06c8e7df08) · 2008-10-20 · mcrider (commit author)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U62 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

After a Site Administrator deletes a plugin from a "Plugins" list
("Delete", then "OK"), the notice that confirms it reads
`Plugin "<name>" successfuly deleted`, with "successfully" misspelt.

The plugin is deleted as asked: nothing is lost, only the wording. Only
the English text is misspelt.

## Impact

- **Lost**: nothing; the plugin is deleted and the notice says so.
- **Who**: the Site Administrator, each time they delete a plugin, in
  the English interface.
- **Way round**: none needed.

Low: wording only, on a task that is done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- A plugin package (`.tar.gz`) of a plugin the installation does not
  hold. Any generic plugin's package does; the walk used a minimal one
  named "U62g5 Test Plugin", version 1.0.0.0.

Steps:

1. Sign in as `admin`.
2. Open Settings › Website
   (`/index.php/publicknowledge/en/management/settings/website`) and
   its "Plugins" tab.
3. Press "Upload A New Plugin", "Upload File", choose the package, and
   press "Save". The notice "Successfully installed version 1.0.0.0"
   shows, and "U62g5 Test Plugin" is listed under "Generic Plugins".
   (Any plugin's "Delete" shows the notice; the steps delete an uploaded
   one so that nothing the installation ships is removed.)
4. Open the arrow at the start of the "U62g5 Test Plugin" row and press
   "Delete". A window headed "Delete" asks "Are you sure you wish to
   delete this plugin from the system?".
5. Press "OK".

**Expected**: the notice reads:

```
Plugin "U62g5 Test Plugin" successfully deleted
```

**Observed**: the row leaves the list, and the notice reads:

```
Plugin "U62g5 Test Plugin" successfuly deleted
```

Control: in the French interface (`/fr_CA/` in the address) the same
steps give "Le plugiciel « U62g5 Test Plugin » a été supprimé."

## Cause

The English message itself is misspelt. `PluginGridHandler::deletePlugin()`
(`lib/pkp/classes/controllers/grid/plugins/PluginGridHandler.php`)
shows `__('manager.plugins.deleteSuccess', ['pluginName' => …])` once
the plugin's folders are gone, and lib/pkp's `locale/en/manager.po`
defines that key as:

```
msgid "manager.plugins.deleteSuccess"
msgstr "Plugin \"{$pluginName}\" successfuly deleted"
```

The wording dates from OJS's first web-based plugin manager
([ab8022c5d0](https://github.com/pkp/ojs/commit/ab8022c5d04720932bd02778ee182b06c8e7df08),
2008, "Plugin successfuly deleted"). In 2012 the plugin grid moved to
pkp-lib
([cca0be2b21](https://github.com/pkp/pkp-lib/commit/cca0be2b21ff350c4c305d7487ffa52bbb8b8334),
"Moved plugin grid to lib-pkp"), and the misspelt locale line came into
pkp-lib's `en_US/manager.xml` a few days later
([485d0a48b7](https://github.com/pkp/pkp-lib/commit/485d0a48b7c86c027c04be8e2422f7e496651231)).
The conversion to `.po` files in 2019
([631efb9665](https://github.com/pkp/pkp-lib/commit/631efb966542b6de2766e0aea847d3d3d8bdb618))
kept it.

Reach:

- Every "Delete" on a "Plugins" list reaches the same handler: a
  context's Settings › Website (walked), the Settings Wizard and the
  site's Administration › Site Settings › "Plugins"
  (`AdminPluginGridHandler` extends `PluginGridHandler`; code).
- No app overrides the key in English (OJS's, OMP's and OPS's
  `locale/en/` read).
- No other message carries the misspelling. A search of every locale
  file of lib/pkp, OJS, OMP and OPS (their plugins included) and of
  ui-library's sources for "successfuly", "succesfully",
  "sucessfully" and their kin finds this line alone.

## Proposed fix

Correct the English message in lib/pkp's `locale/en/manager.po`:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-delete-notice-misspelt/fix.diff).

```diff
--- a/lib/pkp/locale/en/manager.po
+++ b/lib/pkp/locale/en/manager.po
@@ -1621,7 +1621,7 @@
 "to secure it again later."
 
 msgid "manager.plugins.deleteSuccess"
-msgstr "Plugin \"{$pluginName}\" successfuly deleted"
+msgstr "Plugin \"{$pluginName}\" successfully deleted"
 
 msgid "manager.plugins.description"
 msgstr ""
```

Tried on `main`, OJS, OMP and OPS. Step 5 then shows `Plugin "U62g5
Test Plugin" successfully deleted`, and the French interface's notice
reads the same with and without the fix.

**What goes with it**:

- No data repair: the notice's text is built when the plugin is
  deleted. Nothing in the code, the REST API or a plugin hook reads the
  English words; no test in the apps asserts them.
- Backport: the same line applies to 3.5 and 3.4
  (`locale/en/manager.po`) and to 3.3 (`locale/en_US/manager.po`).
- A regression test: delete a plugin and assert the notice reads
  "successfully deleted".

Small: one word in one locale file.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-delete-notice-misspelt/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-delete-notice-misspelt/lib.js))
  takes steps 1–5 on OJS, OMP and OPS, building the plugin package
  itself and removing its folder afterwards if the delete left it.
  `MODE=nb` (the neighbour check) runs the same steps in the French
  interface, with the fix in or out. Each run starts from an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/plugin-delete-notice-misspelt/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  c657990 (2026-10-01). On `main` and 3.5 the delete request answered
  200 and the plugin's folder was removed.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  091fb65453, OMP 9c5e24246c, OPS 38b61882d3; pkp-lib cf3f984335. 3.4:
  pkp-lib 32b0f4b4af; OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b.
  3.3: pkp-lib f6ab331645; OJS ac77c9fb35, OMP 8e72fc8836, OPS
  c5532e2161.
- Code reads for 3.4 and 3.3: pkp-lib's English `manager.po` and
  `PluginGridHandler` (`.php` on 3.4, `.inc.php` on 3.3), and each
  app's English locale files.
- Introduced: `git blame` on `main` stops at 631efb9665; `git log -S`
  on the misspelt words takes it back to OJS ab8022c5d0, which predates
  PKP's use of GitHub, so it has no PR.
- Upstream search: `pkp/pkp-lib#1523` (a closed PR about temporary
  files) quotes the misspelt notice in passing, and `pkp/pkp-lib#4532`
  (closed, fixed) was about the plugin's name showing as a raw key in
  the same notice. Neither is about the spelling.
