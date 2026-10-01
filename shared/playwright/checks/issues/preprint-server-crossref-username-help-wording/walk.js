// Issue report docs/issues/U45-OPS3-preprint-server-crossref-username-help-wording.md (U45 OPS3):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), as
// the dataset's `dbarnes`, on its own context `publicknowledge`. The kit
// builds nothing; the walk's one change is the plugin's "Enabled" box.
//
//   1. sign in as dbarnes
//   2. Settings › Website › "Plugins": tick "Crossref Manager Plugin"
//   3. Settings › Distribution › "DOIs" › "Registration"
//   4. "Registration Agency": "Crossref" (not saved)
//   5. read the help under "Username"
// OJS takes the same steps as the control (its help is right). OMP has no
// Crossref plugin, so no surface; skipped.
// The neighbour the fix must leave alone is read on the same screen: the
// "Depositor name" help, a string of the same locale file, and the
// journal's own "Username" help.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir19 node bin/probe.js all shared/playwright/checks/issues/preprint-server-crossref-username-help-wording/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=ir19 node bin/probe.js all shared/playwright/checks/issues/preprint-server-crossref-username-help-wording/walk.js
// Facts: .reports/<feature>/ir19/username-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

forEachApp(async (app) => {
    if (app.name === 'omp') {
        console.log('[walk] omp: no Crossref plugin, no surface; skipped');
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {DoiSettings} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'dbarnes');
        // 2
        const settings = new DoiSettings(page, app.contextPath);
        await settings.gotoPlugins('crossrefplugin');
        fact('2 crossref enabled before', await settings.pluginBox('crossrefplugin').isChecked());
        if (!facts['2 crossref enabled before']) await settings.setPluginEnabled('crossrefplugin', true);
        fact('2 crossref enabled', await settings.pluginBox('crossrefplugin').isChecked());
        // 3
        await settings.goto('Registration');
        // 4
        await settings.chooseAgency('Crossref');
        const username = settings.field('username');
        await expect(username).toBeVisible({timeout: 20_000});
        await idle(page);
        // 5: the help a box is described by
        const help = async (name) =>
            settings.field(name).evaluate((el) => {
                const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
                return ids
                    .map((id) => document.getElementById(id))
                    .filter(Boolean)
                    .map((d) => (d.textContent || '').replace(/\s+/g, ' ').trim())
                    .filter(Boolean);
            });
        fact('5 "Username" help', await help('username'));
        fact('neighbour "Depositor name" help', await help('depositorName'));
        record('username-registration', await screen(page));
        await shot(page, 'username-registration').catch(() => {});
        record('username-facts', facts);
    } finally {
        await close();
    }
});
