# "Upload A New Plugin" window never says which kind of file to choose

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#142` for PKP bug 8825 · [eea774f965](https://github.com/pkp/pkp-lib/commit/eea774f965ae0cd9f8cb3b12ecc19b1797f5d8ee) · 2014-06-27 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U62 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The "Upload A New Plugin" window should open with "This form allows you
to upload and install a new plugin.  Please ensure the plugin is
compressed as a .tar.gz file.", as "Upgrade Plugin" opens with its own
line. Instead it shows the file field alone, so nothing tells the
administrator which kind of file to choose.

The plugin still installs when the right file is chosen. An administrator
who picks another kind of file only learns it was wrong from the refusal
after "Save".

## Impact

- **Lost**: nothing; the guidance line the application ships for this
  window is never shown.
- **Who**: the Site Administrator, each time they open "Upload A New
  Plugin", on a journal's, press's or server's Plugins list and on the
  site's.
- **Way round**: none in this window. The "Upgrade Plugin" window,
  opened from a plugin's row, states the rule.

Low: a missing line of guidance; the task gets done with the right file.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main` (OJS, OMP or OPS),
with `allow_plugin_install = on` in config.inc.php, the default.

1. Sign in as `admin`.
2. Open Settings › Website (`/index.php/publicknowledge/management/settings/website`) and its "Plugins" tab.
3. Press "Upload A New Plugin", at the right of the "Installed Plugins" title.

**Expected:** the window opens with "This form allows you to upload and
install a new plugin.  Please ensure the plugin is compressed as a
.tar.gz file." above "Select plugin file".

**Observed:** the window holds only the file field, the uploader and
the buttons:

```
Select plugin file*
Drag and drop a file here to begin upload
Upload File
Cancel   Save
```

Control: press "Cancel", then under "Generic Plugins" open "Web Feed
Plugin"'s arrow and press "Upgrade". The "Upgrade Plugin" window opens
with "This form allows you to upgrade a plugin.  Please ensure the
plugin is compressed as a .tar.gz file."

## Cause

The window showed its line until commit eea774f965 (2014) renamed the
upload action from `'install'` to `'upload'` and left the template's
test at `'install'`. The upload and upgrade windows share
`lib/pkp/templates/controllers/grid/plugins/form/uploadPluginForm.tpl`,
which picks its line by the action it was opened for:

```smarty
{if $function == 'install'}
    <p>{translate key="manager.plugins.uploadDescription"}</p>
{elseif $function == 'upgrade'}
    <p>{translate key="manager.plugins.upgradeDescription"}</p>
{/if}
```

`PluginGridHandler::uploadPlugin()` opens the window with
`PluginHelper::PLUGIN_ACTION_UPLOAD`, whose value is `'upload'`, and
`UploadPluginForm::fetch()` passes that value to the template as
`$function`. No action is called `'install'`, so the first branch never
runs. The upgrade action is `'upgrade'` and still matches.

When the template was written (2012) the handler opened the window with
`'install'`. Commit eea774f965 (the first Plugin Gallery work) renamed
the action in the handler and the form, and changed the line's locale
key inside this same `{if}`, but not the condition.

Reach:

- Every list that offers "Upload A New Plugin" opens the same window
  without the line: a context's Settings › Website (on screen), and
  Administration › Site Settings › "Plugins" and the Settings Wizard
  (code: both use the same grid action and template).
- The window's other uses of `$function` (the uploader's address and the
  form's "Save") carry the action's value through and work (code).
- No other template compares an action with `'install'` (searched
  `lib/pkp/templates` and the apps' `templates`).

## Proposed fix

Compare with the constants the handler uses, so the template and the
handler cannot drift apart again
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-plugin-window-no-file-line/fix.diff)):

```diff
-		{if $function == 'install'}
+		{if $function == \PKP\plugins\PluginHelper::PLUGIN_ACTION_UPLOAD}
 			<p>{translate key="manager.plugins.uploadDescription"}</p>
-		{elseif $function == 'upgrade'}
+		{elseif $function == \PKP\plugins\PluginHelper::PLUGIN_ACTION_UPGRADE}
 			<p>{translate key="manager.plugins.upgradeDescription"}</p>
```

Other lib/pkp templates already compare with a class constant this way
(`user/apiProfileForm.tpl`, `controllers/listbuilder/listbuilderOptions.tpl`).
Tried on `main` in all three apps: "Upload A New Plugin" then opened
with the upload line, and "Upgrade Plugin" kept its own line and did not
take the upload one.

**Alternatives:**

- `{if $function == 'upload'}`: the one-word fix, but it keeps a copy of
  the constant's value that a later rename would miss again.
- Renaming the action back to `'install'`: it changes the `function`
  parameter of the upload and save requests for one template's sake.

**What goes with it:**

- No stored data and no API change.
- It applies as written to 3.5 and 3.4. On 3.3 the constants are
  `define()`d globals, so the comparison there would read
  `$smarty.const.PLUGIN_ACTION_UPLOAD`, or simply `'upload'`.
- A regression test: an end-to-end check that "Upload A New Plugin"
  opens with the upload line and "Upgrade Plugin" with the upgrade line.

Small: two lines in one template, and one check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-plugin-window-no-file-line/walk.js),
  takes the Steps (and the "Upgrade Plugin" control) on an install reset
  to the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/upload-plugin-window-no-file-line/walk.js`.
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS),
  each on PostgreSQL, loaded from pkp/datasets c657990 (2026-10-01). The
  one-context dataset leaves "Plugins" out of Administration › Site
  Settings, so the Steps use the context's Settings › Website.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794, OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6 for both); OJS `stable-3_5_0` 091fb65453, OMP 9c5e24246,
  OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` lib/pkp
  32b0f4b4af (OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b);
  `stable-3_3_0` lib/pkp f6ab331645 (OJS ac77c9fb35, OMP 8e72fc883, OPS
  c5532e2161).
- 3.4 and 3.3 (code): `templates/controllers/grid/plugins/form/uploadPluginForm.tpl`
  and `classes/plugins/PluginHelper.php` (`PluginHelper.inc.php` on
  3.3) on each branch's lib/pkp.
- Introduced: `git blame` on the `{if}` line gives b871963256 (2012,
  the template's first version); the fault comes from eea774f965, which
  names PKP's old bug tracker (bug 8825).
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for the
  symptom ("Upload A New Plugin", "upload plugin tar.gz description",
  "Please ensure the plugin is compressed") and the code
  (`uploadPluginForm`, `uploadDescription`). None covers this.
