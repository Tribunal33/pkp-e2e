# Plugins: "Upgrade" with the installed or an older version blames "the version available in the gallery"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; an older version only, since the same version is upgraded again there)
- **Introduced** not traced; two changes: [5a5becffa5](https://github.com/pkp/pkp-lib/commit/5a5becffa51b61d75c0507a9d8e44948661502a6) (`pkp/pkp-lib#142`, 2014-07-04, Alec Smecher (asmecher)) gave the refusal the gallery's sentence, and [cc90cbbd87](https://github.com/pkp/pkp-lib/commit/cc90cbbd87d0595709636986ca23575b7c4c7c70) (`pkp/pkp-lib#8723`, 2023-03-12, Jonas Raoni Soares da Silva (jonasraoni)) extended it to the same version
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U62 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#a3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A Site Administrator who uploads, under a plugin's "Upgrade", the
version already installed or an older one is refused with "Plugin
already installed, and is newer than the version available in the
gallery." The sentence is wrong twice. It names a gallery, though the
file was uploaded from the computer. And at the same version, the
installed plugin is not newer.

The refusal itself is right: nothing changes, and only the reason
misleads.

## Impact

- **Lost**: nothing; the administrator is told a wrong reason.
- **Who**: the Site Administrator, in the "Upgrade Plugin" window of a
  plugin on a journal's, press's or server's Settings › Website ›
  "Plugins" (or the site's list), when the chosen package is not newer
  than the installed plugin: a re-upload of the same release, or the
  wrong file.
- **Way round**: none needed; choose the newer package.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- Two packages of one small generic plugin on the computer, as
  `.tar.gz` files: `u62g3test-1.0.0.0.tar.gz` and
  `u62g3test-1.0.1.0.tar.gz`. Each holds a folder `u62g3test/` with a
  `version.xml` (`<application>u62g3test</application>`,
  `<type>plugins.generic</type>`, `<release>` 1.0.0.0 or 1.0.1.0,
  `<class>U62g3testPlugin</class>`), the class file
  `U62g3testPlugin.php` (a `GenericPlugin` named "U62g3 Test Plugin")
  and `index.php`.
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/failed-upgrade-removes-plugin/lib.js)
  builds them (`buildPackages()`); any plugin with two releases does the
  same.

Steps:

1. Sign in as `admin`.
2. Open Settings › Website
   (`/index.php/publicknowledge/management/settings/website`) and its
   "Plugins" tab.
3. Press "Upload A New Plugin", press "Upload File", choose
   `u62g3test-1.0.0.0.tar.gz` and press "Save". The notice reads
   "Successfully installed version 1.0.0.0", and "U62g3 Test Plugin"
   is listed under "Generic Plugins".
4. Press the "U62g3 Test Plugin" row's arrow, then "Upgrade". In the
   "Upgrade Plugin" window, press "Upload File", choose
   `u62g3test-1.0.0.0.tar.gz` (the version installed) and press "Save".
5. Open the row's "Upgrade" again and "Save"
   `u62g3test-1.0.1.0.tar.gz`. The notice reads "Successfully upgraded
   to version 1.0.1.0".
6. Open the row's "Upgrade" again and "Save"
   `u62g3test-1.0.0.0.tar.gz` (now an older version).

**Expected**: steps 4 and 6 are refused with a sentence about the
installed plugin and the uploaded file, such as the one "Upload A New
Plugin" gives for the same file: "Plugin already installed and
up-to-date."

**Observed**: steps 4 and 6 close the window, leave the plugin as it
was, and show the notice:

```
Plugin already installed, and is newer than the version available in the gallery.
```

## Cause

`PluginHelper::upgradePlugin()` (`lib/pkp/classes/plugins/PluginHelper.php`)
refuses a package that is not newer than the installed version with
`__('manager.plugins.installedVersionNewer')`. The key's English text
describes the Plugin Gallery's case, a plugin whose installed version
is newer than the release the gallery offers, and the gallery uses it
for that (`PluginGalleryGridHandler`, `tools/plugins.php`). It does not
fit an uploaded file.

The text never fitted the upgrade check:

- Before 2014 the key read "Plugin already exists, and is newer or
  equal to installed version", and the upload form's upgrade check
  refused an older package with it. That sentence compares the plugin
  with its own installed version; it named no gallery, but did not read
  right either.
- [5a5becffa5](https://github.com/pkp/pkp-lib/commit/5a5becffa51b61d75c0507a9d8e44948661502a6)
  (`pkp/pkp-lib#142`, the gallery's first implementation) gave the key
  the gallery's sentence and left the upgrade check on it.
- In 2023, `pkp/pkp-lib#8723` rewrote the method. 720b29fd8a corrected
  the install path's own refusal to `manager.plugins.installedVersionNewest`
  ("Plugin already installed and up-to-date.") and kept the upgrade
  check strict (`compare() > 0`). Then
  [cc90cbbd87](https://github.com/pkp/pkp-lib/commit/cc90cbbd87d0595709636986ca23575b7c4c7c70)
  changed it to `compare() >= 0`, so the same version (step 4) is
  refused too, with the same sentence. Before that, a same-version
  "Upgrade" went through.

Reach:

- Under a plugin's "Upgrade", the same version and an older one
  (walked).
- The Plugin Gallery's "Upgrade" calls the same method. The gallery
  offers it for a newer release, and also when the installed version
  equals the gallery's but the plugin's folder is missing
  (`GalleryPlugin::getCurrentStatus()`), the state a failed upgrade
  leaves (report
  [U62-A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U62-A5-failed-upgrade-removes-plugin.md)).
  There the same version reaches this refusal, and with the fix below
  it would read "Plugin already installed and up-to-date." for a plugin
  whose files are gone, which is still wrong. This case is left open
  here: the A5 report's fix stops a failed upgrade from leaving that
  state, and a folder deleted by hand (`pkp/pkp-lib#9573`) needs the
  gallery to install rather than upgrade (code; the gallery cannot be
  reached on the test installs).
- On 3.3 the check is strict (`_checkIfNewer()`), so the same version
  is upgraded again ("Successfully upgraded to version …") and only an
  older one gets the sentence (code).

## Proposed fix

Refuse with `manager.plugins.installedVersionNewest`, whose text fits
the case:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upgrade-refusal-blames-gallery/fix.diff).

```diff
--- a/lib/pkp/classes/plugins/PluginHelper.php
+++ b/lib/pkp/classes/plugins/PluginHelper.php
@@ -306,7 +306,7 @@
             }
 
             if ($installedPlugin->compare($pluginVersion) >= 0) {
-                throw new Exception(__('manager.plugins.installedVersionNewer'));
+                throw new Exception(__('manager.plugins.installedVersionNewest'));
             }
 
             $destinyPath = Core::getBaseDir() . "/plugins/{$category}/{$plugin}";
```

Tried on `main`, OJS, OMP and OPS: steps 4 and 6 then show "Plugin
already installed and up-to-date.", and the plugin stays as it was. Two
control runs read the same with and without the fix: "Upload A New
Plugin" with the installed version still says "Plugin already installed
and up-to-date.", and "Upgrade" with 1.0.1.0 still says "Successfully
upgraded to version 1.0.1.0".

This key is also a gallery status ("Up to date" in its short form), but
its sentence names no gallery and is true of an uploaded file that is
not newer. Since 3.4 it is what "Upload A New Plugin" says for the same
file, so both windows give one reason. Both keys are translated in the
same 59 of lib/pkp's 71 language folders, so no language loses its
message.

**Alternatives**:

- A new key naming both versions ("The uploaded plugin is version
  {$uploadedVersion}, which is not newer than the installed version
  {$installedVersion}."). Clearer, but every language other than
  English shows a raw key until it is translated.
- Reword `manager.plugins.installedVersionNewer` itself: no, the gallery
  uses it correctly.

**What goes with it**:

- No data repair. Nothing an API client or a plugin relies on changes;
  the notice is the form's only output.
- Backport: the same line applies to 3.5 and 3.4. On 3.3 the check is
  in `PluginHelper.inc.php` with the same key; there "Upload A New
  Plugin" refuses the same file with `installedVersionOlder` ("…can be
  updated to a newer version."), so the two windows would not match
  until that is fixed too.
- Test: none proposed for one message.

Small: the key in one line changes, with no test and no data repair.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upgrade-refusal-blames-gallery/walk.js)
  takes steps 1–6 on OJS, OMP and OPS; with `neighbour` it takes the
  fix's control runs. Each run starts from an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/upgrade-refusal-blames-gallery/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- PostgreSQL. Datasets: pkp/datasets c657990 (2026-10-01). `main` and
  3.5 showed the same notices on all three apps.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  091fb65453, OMP 9c5e24246c, OPS 38b61882d3; pkp-lib cf3f984335. 3.4:
  OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b; pkp-lib 32b0f4b4af.
  3.3: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161; pkp-lib
  f6ab331645.
- Code reads: pkp-lib's `classes/plugins/PluginHelper.php` and
  `locale/en/manager.po` on 3.4; `classes/plugins/PluginHelper.inc.php`
  (`upgradePlugin()`, `installPlugin()`, `_checkIfNewer()`),
  `classes/site/VersionDAO.inc.php` and `locale/en_US/manager.po` on
  3.3; `classes/plugins/GalleryPlugin.php` and
  `controllers/grid/plugins/PluginGalleryGridHandler.php` on `main`.
- Introduced: blame on the line gives cc90cbbd87 (`> 0` to `>= 0`);
  `git log -S` on the key gives cca0be2b21 (2012, the upload form's
  upgrade check already using it) and, in the locale file, 5a5becffa5
  (its new text). The 2012 text is read from 5a5becffa5's parent.
- Not walked: the Plugin Gallery's "Upgrade" (no gallery on the test
  installs).
