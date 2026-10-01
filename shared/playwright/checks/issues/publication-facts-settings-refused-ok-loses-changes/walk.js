// Issue report walk: docs/issues/U13-OJS7-publication-facts-settings-refused-ok-loses-changes.md
// (spec U13 register OJS7). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), through the screens:
//   1. `dbarnes` signs in;
//   2. ticks "Publication Facts Label plugin" (Settings › Website › Plugins);
//   3. opens the plugin's "Settings";
//   4-6. types a society name, ticks "Google Scholar", types a Scopus "URL"
//        that is not a Scopus source page;
//   7. presses "OK" and reads the refused window's fields;
//   8-9. corrects only the Scopus "URL" and presses "OK" again;
//   10. reopens "Settings" and reads what was stored.
// The kit builds nothing. OJS only (the plugin is OJS's).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir<n> --dataset <n> --reset --apps ojs
// Run (main):   PROBE_FEATURE=issues-ir<n> PROBE_AGENT=u13ojs7 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-settings-refused-ok-loses-changes/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset --apps ojs
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u13ojs7 node bin/probe.js ojs <this file>
// Fix trial:    trial.sh beside this file. Neighbour: neighbour.js.
// Facts: .reports/<feature>/u13ojs7/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {openPflRow, enablePfl, readPflSettings} = require('../publication-facts-settings-warn-missing-funding-plugin/lib');
const {readPflFields, fillPflForm, pressPflOk, reopenPflSettings} = require('./lib');

const ENTERED = {society: 'u13ojs7 Society', scholar: true, scopusUrl: 'https://www.example.org/u13ojs7'};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null});
    const {page, close} = await launch(app);
    const failures = [];
    page.on('response', (r) => { if (r.status() >= 500) failures.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
    page.on('pageerror', (e) => failures.push(`pageerror ${String(e.message).slice(0, 200)}`));
    try {
        // 1. Sign in as dbarnes.
        await signIn(page, 'dbarnes');

        // 2. Settings › Website › Plugins: tick "Publication Facts Label plugin".
        const row = await openPflRow(page, app);
        fact('2-enable', await enablePfl(page, row));

        // 3. The plugin's "Settings".
        const win = await readPflSettings(page, row, '03-settings-window');
        fact('3-window', {settingsRequest: win.settingsRequest, firstSections: win.firstSections, fields: await readPflFields(page)});

        // 4-6. Type and tick.
        await fillPflForm(page, ENTERED);
        const before = await readPflFields(page);
        record('06-entered', await screen(page)); await shot(page, '06-entered');
        fact('6-entered', before);

        // 7. "OK".
        const ok = await pressPflOk(page);
        const s = await screen(page); record('07-after-ok', s); await shot(page, '07-after-ok');
        fact('7-ok', {...ok, notices: s.notices || null});
        fact('7-fields-after-ok', ok.windowOpen ? await readPflFields(page) : null);
        if (!ok.windowOpen) return;

        // 8-9. Correct only the Scopus "URL", "OK" again.
        await fillPflForm(page, {scopusUrl: 'https://www.scopus.com/sourceid/12345'});
        const ok2 = await pressPflOk(page);
        const s2 = await screen(page); record('09-after-second-ok', s2); await shot(page, '09-after-second-ok');
        fact('9-ok', {status: ok2.status, windowOpen: ok2.windowOpen, notices: s2.notices || null});

        // 10. Reopen "Settings".
        await reopenPflSettings(page, row);
        record('10-reopened', await screen(page)); await shot(page, '10-reopened');
        fact('10-reopened', await readPflFields(page));
    } finally {
        fact('failures', failures);
        record('facts', facts);
        await close();
    }
});
