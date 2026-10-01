// Issue report walk: docs/issues/U13-OJS8-publication-facts-start-date-typo-saved-as-other-date.md
// (spec U13 register OJS8). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), through the screens:
//   1. `dbarnes` signs in;
//   2. ticks "Publication Facts Label plugin" (Settings › Website › Plugins);
//   3. opens the plugin's "Settings";
//   4-6. types "2026-99-99" in "Start Date", "OK", reopens;
//   7-9. types "2026-02-30", "OK", reopens;
//   10. picks the 15th from the calendar, "OK", reopens (control).
// The kit builds nothing; the stored setting is read after each "OK"; with
// the fix in, a refused "OK" leaves the window open and the walk goes on in it.
// OJS only (the plugin is OJS's).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset --apps ojs
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u13ojs8 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-start-date-typo-saved-as-other-date/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset --apps ojs
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u13ojs8 node bin/probe.js ojs <this file>
// Fix trial:    trial.sh beside this file. Neighbour: neighbour.js.
// Facts: .reports/<feature>/u13ojs8/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {openPflRow, enablePfl, readPflSettings} = require('../publication-facts-settings-warn-missing-funding-plugin/lib');
const {pressPflOk, reopenPflSettings} = require('../publication-facts-settings-refused-ok-loses-changes/lib');
const {readStartDate, typeDate, pickDay, storedStartDate} = require('./lib');

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
    const ok = async (n) => {
        const r = await pressPflOk(page);
        const s = await screen(page); record(`${n}-after-ok`, s); await shot(page, `${n}-after-ok`);
        return {...r, notices: s.notices || null, stored: storedStartDate(app)};
    };
    // Reopen "Settings" when "OK" closed the window; a refused "OK" leaves it open.
    const reopen = async () => {
        const open = await page.locator('form#pflPluginSettingsForm').isVisible().catch(() => false);
        if (!open) await reopenPflSettings(page, row);
        return {reopened: !open, ...(await readStartDate(page))};
    };
    let row;
    try {
        // 1. Sign in as dbarnes.
        await signIn(page, 'dbarnes');

        // 2. Settings › Website › Plugins: tick "Publication Facts Label plugin".
        row = await openPflRow(page, app);
        fact('2-enable', await enablePfl(page, row));

        // 3. The plugin's "Settings".
        const win = await readPflSettings(page, row, '03-settings-window');
        fact('3-window', {settingsRequest: win.settingsRequest, startDate: await readStartDate(page), stored: storedStartDate(app)});

        // 4-5. Type "2026-99-99", "OK".
        fact('4-typed', await typeDate(page, '2026-99-99'));
        record('04-typed', await screen(page)); await shot(page, '04-typed');
        fact('5-ok', await ok('05'));

        // 6. Reopen.
        fact('6-reopened', await reopen());
        record('06-reopened', await screen(page)); await shot(page, '06-reopened');

        // 7-8. Type "2026-02-30", "OK".
        fact('7-typed', await typeDate(page, '2026-02-30'));
        record('07-typed', await screen(page)); await shot(page, '07-typed');
        const ok8 = await ok('08');
        fact('8-ok', ok8);

        // 9. Reopen.
        fact('9-reopened', await reopen());
        record('09-reopened', await screen(page)); await shot(page, '09-reopened');

        // 10. Control: pick the 15th from the calendar, "OK", reopen.
        // With the window still open after a refused "OK" (the fix in), the day
        // is picked over the refused text; otherwise the box is cleared first.
        const refused = ok8.windowOpen;
        fact('10-picked', await pickDay(page, 15, {clear: !refused}));
        fact('10-ok', await ok('10'));
        fact('10-reopened', await reopen());
        record('10-reopened', await screen(page)); await shot(page, '10-reopened');
    } finally {
        fact('failures', failures);
        record('facts', facts);
        await close();
    }
});
