# The Publication Facts Label settings always warn "Funding Plugin Not Present", though funders are now part of the journal

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none (the warning is true there)
  - 3.4: none (code; the Publication Facts Label plugin is not bundled)
  - 3.3: none (code; the Publication Facts Label plugin is not bundled)
- **Introduced** `pkp/pflPlugin#65` for `pkp/pkp-lib#12392` · [9d80acd](https://github.com/pkp/pflPlugin/commit/9d80acd05b5438ac7fdc7bfa98cd982ee45ae90f) · 2026-04-26 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal manager who opens the "Publication Facts Label plugin"
settings always sees "Funding Plugin Not Present", telling them to
install and enable the Funding plugin from the Plugin Gallery. Funders
are now part of the journal's own metadata ("Enable funder metadata"
under the workflow's metadata settings), and the label's "External
funding" row is built from them. The Plugin Gallery offers no Funding
plugin for this version.

The label still shows funding correctly, but the manager is sent looking
for that plugin. When funder metadata is
off, the warning gives the same advice instead of pointing at the
setting that controls the row.

## Impact

- **Lost**: nothing but the manager's time. The settings save and the
  label is right.
- **Who**: managers of journals that turn the label on, on every opening
  of its settings. The plugin ships with OJS but is off on every
  journal. The fault would first ship in OJS 3.6.0.
- **Way round**: ignore the warning. Nothing on screen says it can be
  ignored.

Low: the warning misleads, but the outcome is right. A site
administrator can still upload a Funding plugin by hand, because an
upload checks no application version; if that clashed with the core
funder data, this would be medium. That was not tried.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (journal
  `publicknowledge`). In it the journal's funder metadata is on, with
  authors asked for funders during submission. "Publication Facts Label
  plugin" is off.

Steps:

1. Sign in as `dbarnes`.
2. Go to Settings › Workflow, tab "Submission", side tab "Metadata"
   (`/index.php/publicknowledge/management/settings/workflow`). Under
   "Funders", "Enable funder metadata" is ticked, with "Ask the author
   for funder metadata during submission." chosen. [3.5: there is no
   "Funders" field.]
3. Go to Settings › Website, tab "Plugins", and tick "Publication Facts
   Label plugin".
4. Press the arrow beside the plugin's name, then "Settings".

**Expected**: the "Publication Facts Label plugin" window opens on
"Journal Information", with no warning about funding.

**Observed**: the window opens with a first section headed "Funding
Plugin Not Present", above "Journal Information":

```
Funding Plugin Not Present

The Funding plugin is not present and enabled. In order for funding
data to be presented by the Publication Facts Label, this plugin will
need to be installed and enabled, and provided with the relevant data
for each submission. Check the Plugin Gallery for this plugin.
```

## Cause

`PflSettingsForm::fetch()` (in `pkp/pflPlugin`, shipped in OJS as
`plugins/generic/pflPlugin`) decides whether to show the warning by
looking for the old plugin:

```php
$fundingPlugin = PluginRegistry::getPlugin('generic', 'FundingPlugin');
$templateMgr->assign([
    'pluginName' => $this->plugin->getName(),
    'fundingPluginPresent' => $fundingPlugin ? $fundingPlugin->getEnabled() : null,
]);
```

`templates/settings.tpl` prints
`plugins.generic.pflPlugin.fundingPluginMissing` and its description
when `fundingPluginPresent` is false.

On `main`, funders moved into pkp-lib (`pkp/pkp-lib#12392`). The
journal's `funders` setting (`0`, `enable`, `request` or `require`,
default `request` for a new journal) turns them on. The 3.6.0 upgrade
`I12392_Funders` migrates the Funding plugin's data and deletes the
plugin's settings and its `versions` row. So no `FundingPlugin` is
registered, and the check is false on every journal.

Commit 9d80acd (`pkp/pflPlugin#65`) switched the label itself to the
core data: `displayArticlePfl()` now reads `$journal->getData('funders')`
for the "External funding" row, and `getFundedSubmissionCount()` lost
its `return null` guard on the Funding plugin (its join on a `funders`
table now reads the core table). The settings form was left on the old
check. Before that commit, the form and the label both looked for the
Funding plugin and agreed.

Reach:

- This check is the plugin's only remaining reference to
  `FundingPlugin`. No other code in OJS `main`, its `lib/pkp` or its
  other bundled plugins looks for it, apart from the upgrade migration
  above. Checked in the code.
- Journals upgraded to 3.6 without the Funding plugin enabled get no
  `funders` setting: `I12392_Funders` writes `enable` only where the
  plugin was on, and the schema's default is applied only when a journal
  is created (`PKPContextService::add()`). Their funder metadata is off
  and the label's row reads "NA". With the fix, the form warns them that
  funder metadata is not enabled, which is right. Checked in the code.
- OMP and OPS do not ship the plugin.

## Proposed fix

Give the plugin one place that says whether the journal collects
funders. Both the label and the settings form ask it, and the warning
then names the setting that really controls the row:

```diff
+    public function isFundingEnabled($journal): bool
+    {
+        return (bool) $journal->getData('funders');
+    }
 …
-        $pflFundingEnabled = $journal->getData('funders');
+        $pflFundingEnabled = $this->isFundingEnabled($journal);
 …
-        $fundingPlugin = PluginRegistry::getPlugin('generic', 'FundingPlugin');
         $templateMgr->assign([
             'pluginName' => $this->plugin->getName(),
-            'fundingPluginPresent' => $fundingPlugin ? $fundingPlugin->getEnabled() : null,
+            'fundingEnabled' => $this->plugin->isFundingEnabled($context),
         ]);
```

`PflSettingsForm.php`'s `use PKP\plugins\PluginRegistry;` is then
unused, and the diff removes it. `settings.tpl` tests `$fundingEnabled`
and prints two new keys, "Funder Metadata Not Enabled" and "This journal
does not collect funder metadata. In order for funding data to be
presented by the Publication Facts Label, enable "Funders" under
Settings > Workflow > Submission > Metadata, and provide the relevant
data for each submission." The whole change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-warn-missing-funding-plugin/fix.diff).
Its paths start at the OJS root; in a `pkp/pflPlugin` checkout, apply
it with `git apply -p4`.

The keys are renamed rather than given new English text, so that the
14 other languages show the English text until translated instead of
the old advice. The diff renames them in `locale/en/locale.po` only. The
same pull request should delete the two old `fundingPluginMissing`
entries from the 14 other `locale/*/locale.po` files, so that no
translator works on text nothing prints.

The fix was tried on `main`. With funder metadata on, the window opens
on "Journal Information" with no warning. With "Enable funder metadata"
unticked and saved, it warns "Funder Metadata Not Enabled" with the text
above.

**Alternatives:**

- Drop the warning: the manager would then get no hint when funder
  metadata is off and the row reads "NA".
- Change only the English text of the old keys: 14 languages would
  still show the old advice.

**What goes with it:**

- Branches: `pkp/pflPlugin` `main` only, with the submodule bump in
  OJS.
- Left out: since 9d80acd, `getFundedSubmissionCount()` counts funded
  articles even when funder metadata is off, where it used to give
  "N/A". It could take the same `isFundingEnabled()` check; that is a
  separate change and was not tried. `PflPlugin.php` also still imports
  `PluginRegistry` without using it.
- No data repair, API or hook change.

Small: one helper with two callers in one plugin, two renamed locale
keys and the old keys' removal from the other locales, tried on OJS.

## Evidence

- Walk script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-warn-missing-funding-plugin/walk.js)
  takes Steps 1 to 4 on an install freshly loaded from PKP's default test
  dataset (pkp/datasets 38ab955, 2026-09-30; PostgreSQL):
  `node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-settings-warn-missing-funding-plugin/walk.js`.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-warn-missing-funding-plugin/neighbour.js)
  is the funder-metadata-off check: it unticks "Enable funder metadata",
  saves, and takes steps 3 and 4. The fix was applied for the trial with
  `node bin/try-fix.js apply …/fix.diff ojs`.
- Branch heads walked: OJS `main` bade233f73 (2026-09-30), `lib/pkp`
  2e377d27fc, plugin 622c85d (2026-08-27); `dbscripts/xml/version.xml`
  reads 3.6.0.0. On `stable-3_5_0`, walked with the same script on the
  3.5 dataset: OJS 92b9a16b48, `lib/pkp` a9c76aed62, plugin 95f7a35. There
  `PflPlugin.php` and `PflSettingsForm.php` both look for
  `FundingPlugin`, and `schemas/context.json` has no `funders` setting.
- 3.4 and 3.3, read in the code: OJS `upstream/stable-3_4_0`
  (9571d8fde7) and `upstream/stable-3_3_0` (9fdb9bcf9a) do not bundle
  `pflPlugin`. `pkp/pflPlugin` `stable-3_4_0` (97cf5da) and
  `stable-3_3_0` (7a91388) look for `FundingPlugin` in both the form and
  the label, and the pkp-lib branches (df13621c2d, d446601ebe) have no
  `funders` context setting.
- Trace: the check came with the warning in 7bfa7948 (2024-05-03) and
  was right until 9d80acd. `pkp/pflPlugin#65` was merged 2026-07-06,
  with the pkp-lib pull request `pkp/pkp-lib#12397` (commit
  d50c812aaf, merge 19c6a6ea83) for the issue `pkp/pkp-lib#12392`, which lists "Support
  for Funder Data in plugins that are dependent on Funding Plugin: pfl"
  as done.
- Default state: `pflPlugin` has no `settings.xml` and nothing in OJS
  enables it, so it is off on a new journal (and in the dataset).
- Plugin upload: `PluginHelper::installPlugin()` checks only the
  archive's `version.xml` against the installed version, and the upload
  is offered to site administrators. The Plugin Gallery
  (`https://pkp.sfu.ca/ojs/xml/plugins.xml`, read 2026-10-01) lists
  Funding plugin releases for 3.3 and 3.4 only; `ajnyga/funding`'s
  `main` branch is marked "OJS/OMP/OPS 3.6 development version".
  Unverified: whether either installs or runs beside the core `funders`
  table, which `I12392_Funders` recreates under the old plugin's table
  name.
- Upstream searched in pkp/pflPlugin, pkp/pkp-lib and pkp/ojs ("Funding
  Plugin Not Present", publication facts label funding, pfl funding
  plugin, `FundingPlugin`, `fundingPluginPresent`, `PflSettingsForm`,
  settings warning). `pkp/pflPlugin#21` (the "External funding" row
  without the plugin, closed) and the `pkp/pkp-lib#12392` work are about
  other things.
- Not walked: a journal upgraded from 3.5 (read in the code above).
