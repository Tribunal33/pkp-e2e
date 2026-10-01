// Issue report docs/issues/U45-A21-registration-save-without-agency-logs-warning.md
// (U45 A21): the report's Steps to reproduce, walked through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// as the dataset's `dbarnes`, on its own context `publicknowledge`. The kit
// builds nothing.
//
//   1. sign in as dbarnes
//   2. Settings › Distribution › "DOIs" › "Registration"
//   3. "Save" (pressed twice, to show one log line per press)
//   4. the server's PHP log
//
// With WALK=neighbour it takes the control instead, on OJS and OPS (a
// press has no agency plugin): tick "Crossref Manager Plugin" on Settings ›
// Website › "Plugins"; on "Registration" choose "Crossref", type "Depositor
// name" and "Depositor email", "Save"; then choose "None", "Save". Both
// saves post a `registrationAgency`, so neither logs the warning, with the
// fix in or out, and the stored agency follows the choice.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir18 node bin/probe.js all shared/playwright/checks/issues/registration-save-without-agency-logs-warning/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=ir18 node bin/probe.js all shared/playwright/checks/issues/registration-save-without-agency-logs-warning/walk.js
// Facts: .reports/<feature>/ir18/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const {logFile, logSize, phpMessagesSince} = require('./lib');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NEIGHBOUR = process.env.WALK === 'neighbour';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    if (NEIGHBOUR && app.name === 'omp') {
        console.log('[walk] omp: no registration agency plugin, no neighbour case; skipped');
        return;
    }
    const {DoiSettings} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const {table, id, settings: settingsTable} = app.contextTables;
    const cid = sql(app, `select ${id} from ${table} where path='${app.contextPath}'`);
    const storedAgency = () => sql(app, `select coalesce(setting_value, '<null>') from ${settingsTable} where ${id}=${cid} and setting_name='registrationAgency'`);
    const facts = {app: app.name, line: app.line || 'main', mode: NEIGHBOUR ? 'neighbour' : 'walk', log: logFile(app)};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const name = (s) => `${NEIGHBOUR ? 'nb-' : ''}${s}`;

    const {page, close} = await launch(app);
    const settings = new DoiSettings(page, app.contextPath);

    /** Press the Registration tab's "Save"; the answer, the status line and what PHP logged for it. */
    const save = async (label) => {
        const from = logSize(app);
        const response = await settings.pressSave(settings.registration);
        const request = response.request();
        const out = {
            request: `${request.method()} ${new URL(response.url()).pathname.replace(/^.*\/api\//, '/api/')}`,
            override: request.headers()['x-http-method-override'] || null,
            posted: request.postData(),
            status: response.status(),
            body: (await response.text().catch(() => '')).slice(0, 300),
        };
        await expect(settings.savedStatus(settings.registration)).toBeVisible({timeout: T});
        out.statusLine = (await settings.registration.locator('[role="status"]').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
        await idle(page);
        await sleep(500);
        out.logged = phpMessagesSince(app, from);
        out.storedAgency = storedAgency();
        fact(label, out);
        return out;
    };

    try {
        // 1
        await signIn(page, 'dbarnes');
        fact('0 stored agency before', storedAgency());

        if (!NEIGHBOUR) {
            // 2
            await settings.goto('Registration');
            await idle(page);
            const s = await screen(page);
            record(name('2-registration'), s);
            await shot(page, name('2-registration')).catch(() => {});
            fact('2 tab text', (await settings.registration.innerText()).replace(/\s+/g, ' ').trim());
            fact('2 fields', await settings.registration.locator('input, select, textarea').count());

            // 3, 4
            await save('3 first save');
            record(name('3-saved'), await screen(page));
            await shot(page, name('3-saved')).catch(() => {});
            // "Saved" goes after about five seconds; the second press then shows it again
            await expect(settings.savedStatus(settings.registration)).toBeHidden({timeout: T});
            await save('3 second save');
        } else {
            await settings.gotoPlugins('crossrefplugin');
            await settings.setPluginEnabled('crossrefplugin', true);
            fact('n1 crossref enabled', await settings.pluginBox('crossrefplugin').isChecked());

            await settings.goto('Registration');
            await settings.chooseAgency('Crossref');
            await expect(settings.field('depositorName')).toBeVisible({timeout: T});
            await settings.field('depositorName').fill('Public Knowledge Project');
            await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
            await save('n2 save with Crossref');
            record(name('n2-crossref-saved'), await screen(page));

            await expect(settings.savedStatus(settings.registration)).toBeHidden({timeout: T});
            await settings.chooseAgency('None');
            await save('n3 save with None');
            record(name('n3-none-saved'), await screen(page));
            await shot(page, name('n3-none-saved')).catch(() => {});
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
