# Publication Facts Label settings always warn "Funding Plugin Not Present", for a plugin that no longer exists

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code; the plugin is not bundled)
  - 3.3: none (code; the plugin is not bundled)
- **Introduced** `pkp/pflPlugin#65` for `pkp/pkp-lib#12392` · [9d80acd05b](https://github.com/pkp/pflPlugin/commit/9d80acd05b5438ac7fdc7bfa98cd982ee45ae90f) · 2026-04-26 (commit date) · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal manager who opens the "Publication Facts Label plugin"
settings window always finds it headed "Funding Plugin Not Present",
which tells them to install and enable the Funding plugin from the
Plugin Gallery. That plugin is gone: funders are now part of the
journal's own metadata (the "Funders" setting), and the plugin's
"Publication Facts" panel on article pages takes its "External funding"
row from that setting.

The settings still save, but the manager is sent looking for a plugin
that cannot be installed, and the warning never goes away. The warning
also ignores the "Funders" setting. A journal that turns funder metadata
off, which leaves the panel with no funding data, sees the same warning
and is not told to turn the setting back on.

Only journals on the coming release meet it, once they turn the plugin
on (it is off by default). On 3.5 the panel still uses the Funding
plugin, so the warning there is true.

## Impact

- **Lost.** A manager's time spent looking for a plugin that cannot be
  installed.
- **Who.** Journal managers who open the plugin's settings, every time
  they open them.
- **Way round.** Ignore the warning.

Low: a misleading warning, while the settings save and the panel reads
the right setting.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`.
  Its funder metadata is on: Settings › Workflow › Submission ›
  "Metadata", under "Funders", has "Enable funder metadata" ticked and
  "Ask the author for funder metadata during submission." chosen. The
  "Publication Facts Label plugin" is off.

Funder metadata on:

1. Sign in as `rvaca` (Journal manager).
2. Settings › Website › "Plugins": tick "Enabled" on "Publication Facts
   Label plugin".
3. Press the row's arrow, then "Settings".

**Expected.** The "Publication Facts Label plugin" window opens with
"Journal Information" first, with no warning about funding, since the
journal's funder metadata is on.

**Observed.** The window opens with this section before "Journal
Information":

```
Funding Plugin Not Present
The Funding plugin is not present and enabled. In order for funding data to be presented by the Publication Facts Label, this plugin will need to be installed and enabled, and provided with the relevant data for each submission. Check the Plugin Gallery for this plugin.
```

The window's "OK" still saves: it closes the window and shows "Your
changes have been saved.".

Funder metadata off:

4. Settings › Workflow › Submission › "Metadata": under "Funders",
   untick "Enable funder metadata" and press "Save".
5. Settings › Website › "Plugins": press the "Publication Facts Label
   plugin" row's arrow, then "Settings".

**Expected.** The window warns that funder metadata is off, since the
panel now has no funding data to show. With the proposed fix it reads
"Funder Metadata Not Enabled".

**Observed.** The same "Funding Plugin Not Present" warning as in step
3, word for word.

## Cause

`PflSettingsForm::fetch()` (pkp/pflPlugin, bundled with OJS as
`plugins/generic/pflPlugin`) sets `fundingPluginPresent` from
`PluginRegistry::getPlugin('generic', 'FundingPlugin')` (lines
132–135), and `templates/settings.tpl` (lines 22–26) prints
`plugins.generic.pflPlugin.fundingPluginMissing` and its description
when that is false. The check was right while the panel's "External
funding" row came from the Funding plugin, a separate plugin. On 3.5,
with the Funding plugin installed and enabled, `fundingPluginPresent`
is true and the window opens without the warning (code).

`pkp/pkp-lib#12392` moved funders into the core for 3.6. It added the
context setting `funders` (the "Funders" field of the workflow's
Metadata settings) and the core `funders` tables. Its upgrade,
`I12392_Funders`, moves the plugin's data, sets `funders` to `enable`
for every journal that had the plugin on, and removes the plugin's
settings and `versions` row. `pkp/pflPlugin#65`, written for that
issue, changed `PflPlugin::displayArticlePfl()` to read
`$journal->getData('funders')` and dropped the plugin check from
`getFundedSubmissionCount()`. It left the settings form's check as it
was.

On `main` no `FundingPlugin` is ever registered, so the check is always
false and the warning always shows. The form never reads `funders`, the
setting the panel depends on now.

Reach:

- The warning's advice cannot be followed: the Plugin Gallery offers
  the Funding plugin for 3.3 and 3.4 only, and the 3.6 upgrade removes
  it.
- The panel is not affected: its funding row reads `funders` (code).
  The panel does not show on `main` today for another reason,
  [pkp-e2e#211](https://github.com/jardakotesovec/pkp-e2e/issues/211).
- No other code in OJS, OMP or OPS on `main` asks for the Funding
  plugin (code).

## Proposed fix

Have the form test the setting the panel reads, and point the warning
at it. `fetch()` assigns `(bool) $context->getData('funders')`, the
same test `displayArticlePfl()` makes, and the template warns, with new
keys, only when it is false. The change goes in pkp/pflPlugin, followed
by a submodule bump in OJS
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-funding-warning/fix.diff)):

```diff
--- a/plugins/generic/pflPlugin/PflSettingsForm.php
+++ b/plugins/generic/pflPlugin/PflSettingsForm.php
         $templateMgr = TemplateManager::getManager($request);
-        $fundingPlugin = PluginRegistry::getPlugin('generic', 'FundingPlugin');
         $templateMgr->assign([
             'pluginName' => $this->plugin->getName(),
-            'fundingPluginPresent' => $fundingPlugin ? $fundingPlugin->getEnabled() : null,
+            // The panel's "External funding" row reads the journal's funder metadata (pkp/pkp-lib#12392).
+            'fundersEnabled' => (bool) $context->getData('funders'),
         ]);
--- a/plugins/generic/pflPlugin/templates/settings.tpl
+++ b/plugins/generic/pflPlugin/templates/settings.tpl
-	{if !$fundingPluginPresent}
-		{fbvFormArea id="pflPluginSettings" title="plugins.generic.pflPlugin.fundingPluginMissing"}
-			<p><strong>{translate key="plugins.generic.pflPlugin.fundingPluginMissing.description"}</strong></p>
+	{if !$fundersEnabled}
+		{fbvFormArea id="pflPluginSettings" title="plugins.generic.pflPlugin.fundersDisabled"}
+			<p><strong>{translate key="plugins.generic.pflPlugin.fundersDisabled.description"}</strong></p>
```

`fix.diff` also makes two changes this excerpt leaves out:

- `PflSettingsForm.php` drops `use PKP\plugins\PluginRegistry;`, which
  nothing else in the file uses.
- `locale/en/locale.po` replaces the two old strings with
  `plugins.generic.pflPlugin.fundersDisabled`, "Funder Metadata Not
  Enabled", and its `.description`, "Funder metadata is not enabled for
  this journal. In order for funding data to be presented by the
  Publication Facts Label, enable "Funders" under Settings > Workflow >
  Submission > Metadata, and provide the funders for each submission."

Tried on `main`. With the fix, step 3 opens the window with "Journal
Information" first, and step 5 shows "Funder Metadata Not Enabled" and
its description. Without the fix, both show "Funding Plugin Not
Present".

Journals upgraded to 3.6 that never had the Funding plugin get no
`funders` setting from `I12392_Funders`. Only new journals get the
schema's default `request`, because defaults are written when a
journal is created (`PKPContextService::add()`). For upgraded journals
without the plugin, `getData('funders')` is null: their Metadata
settings show "Enable funder metadata" unticked, and the panel has no
funding data. So the new warning shows for them, and it is accurate
(code). Whether those journals should get funder metadata on by default
is a question for the `pkp/pkp-lib#12392` upgrade, not for this fix.

**Alternatives**

- Delete the warning and its keys. Simpler, but a manager with funder
  metadata off would no longer learn why the panel reports no funding,
  which is the job the warning was written for.
- Keep the keys and change only the English text. Every other language
  would go on telling managers to install a plugin. New keys fall back
  to English until they are translated.

**What goes with it**

- An OJS `main` commit moving `plugins/generic/pflPlugin` to the fixed
  plugin commit.
- The old keys in the other languages' files go with the next
  translation sync. The diff changes the English file only.
- The plugin's `stable-3_5_0` commit needs no change: there the panel
  still reads the Funding plugin.
- Test: an e2e scenario in U13 that opens the settings window with
  "Funders" on (no warning) and off (the new warning).

A proposal. Small: a few lines in one plugin's form, template and
English strings, and a submodule bump, tried.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/publication-facts-settings-funding-warning/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-funding-warning/walk.js),
  with its helpers in `lib.js` beside it, run with
  `PROBE_FEATURE=issues-ir14 PROBE_AGENT=ir14 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-settings-funding-warning/walk.js [ok] [funders-off]`.
  Without arguments it takes steps 1–3. `ok` presses the window's "OK"
  after step 3. `funders-off` adds steps 4–5 and then ticks the box
  back. Steps 1–5 were also run with `fix.diff` applied to OJS `main`.
  The step 4–5 run doubles as the check that the fix reaches no
  further than it should: the warning still shows when funder metadata
  is off.
- Branch tips: OJS `main` bade233f73 with pkp-lib 2e377d27fc and
  pflPlugin 622c85dcb1 (the same check is on pkp/pflPlugin `main` on
  2026-10-01); OJS `stable-3_5_0` 92b9a16b48 with pkp-lib a9c76aed62 and
  pflPlugin 95f7a35886 (1.2.1.4); `stable-3_4_0` 9571d8fde7;
  `stable-3_3_0` 9fdb9bcf9a.
- 3.5 (walked, and read): steps 1–3 on the `stable-3_5_0` install. Its
  Metadata settings have no "Funders" field, and the window shows the
  same warning. The read: pflPlugin 95f7a35886's `PflPlugin.php` lines
  180 and 264 still take the funding row from `FundingPlugin`, so the
  warning is true there. The window without the warning (3.5 with the
  Funding plugin installed and enabled) was read in the code, not
  walked: the test installs cannot reach the Plugin Gallery. The
  gallery list (`https://pkp.sfu.ca/ojs/xml/plugins.xml`, read
  2026-10-01) offers Funding 2.1.4.2 and 3.3.0.4 for 3.3 and 3.4.0.4
  for 3.4. A 3.5 release (3.5.0.2) is on ajnyga/funding's GitHub
  releases page only, so "Check the Plugin Gallery" finds nothing on 3.5
  either. That is about the gallery's listing, not this report's cause.
- The plugin has been bundled with OJS `main` and `stable-3_5_0` since
  2025-10-21 (fb4966dfc8, 10669c6e24). It has no default settings file,
  and the dataset has it off.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` and `upstream/stable-3_3_0`
  of OJS have no `plugins/generic/pflPlugin` and no such entry in
  `.gitmodules`. The gallery's copies for those versions (pflPlugin
  1.1.x and 1.0.x) were not read; the gallery offers a Funding plugin
  for both.
- Introduced (commit dates throughout): `git blame` on
  `PflSettingsForm.php` lines 132 and 135 (fef10c60, 2024-11-07) and
  `templates/settings.tpl` lines 22–26 (7bfa7948, 2024-05-03), both
  right when written. They became wrong with 9d80acd05b (2026-04-26),
  merged as `pkp/pflPlugin#65` (merge commit 8a8d96f), which replaced
  the panel's two `FundingPlugin` checks and not the form's. The core
  side of `pkp/pkp-lib#12392` is pkp-lib d50c812aaf (2026-07-06,
  `pkp/pkp-lib#12397`) with the upgrade
  `classes/migration/upgrade/v3_6_0/I12392_Funders.php`, and OJS
  0bbbaa9d1b (2026-07-06, `pkp/ojs#5378`).
- Upgraded journals (code): `I12392_Funders` writes `funders` only
  for journals with `fundingplugin` enabled. `PKPContextService::add()`
  is the only place the context schema's defaults are written.
- Other uses of the Funding plugin: a search for `FundingPlugin`,
  `fundingplugin` and `'funding'` in the OJS, OMP and OPS `main`
  checkouts (app, `lib/pkp`, `lib/ui-library`, `plugins`). Apart from
  these lines, only `I12392_Funders` and a template fixture in
  `lib/pkp/tests/classes/template/TemplateIntegrationTest.php` name the
  plugin.
- Upstream search (2026-10-01), issues and pull requests, open and
  closed, in pkp/pkp-lib, pkp/ojs, pkp/ui-library and pkp/pflPlugin, for
  "Funding Plugin Not Present", "fundingPluginMissing",
  `PflSettingsForm`, "pfl funding plugin" and "Publication Facts"
  funding. `pkp/pkp-lib#12397` matched only on a review comment about
  the upgrade. `pkp/pflPlugin#21` (closed, "“External funding” displays
  ”No” when the funding plugin has not been installed") is about the
  panel's row, not the settings window. No candidate is this fault.
- Not driven: MySQL (the fault does not depend on the database); the
  French window.
