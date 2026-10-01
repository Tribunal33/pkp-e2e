// Issue report docs/issues/U45-A19-agency-choice-unticks-every-doi-kind.md (U45 A19):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), as
// the dataset's `dbarnes`, on its own context `publicknowledge`. The kit
// builds nothing.
//
//   1. sign in as dbarnes
//   2. Settings › Website › "Plugins": tick "Crossref Manager Plugin"
//   3. Settings › Distribution › "DOIs" › "Setup", "Items with DOIs":
//        OJS: "Articles" is ticked; tick "Article galleys, such as a
//             published PDF", then "Peer Review" (on 3.5, which has no
//             "Peer Review" kind and where Crossref also takes "Issues":
//             galleys, then "Issues")
//        OPS: untick "Preprints", tick "Preprint galleys, such as a
//             published PDF", tick "Preprints" again
//      "DOI Prefix" 10.1234 (the dataset has none, and the form refuses
//      a save without one), "Save"
//   4. the DOIs page (the list before the agency: control)
//   5. "Registration": "Registration Agency" "Crossref", "Depositor name"
//      "Public Knowledge Project", "Depositor email" dbarnes@mailinator.com,
//      "Save"
//   6. reload "Setup"
//   7. the DOIs page again
// Besides the screens it reads the stored `enabledDoiTypes` after steps 3
// and 5, and the browser console on the DOIs page.
// OMP has no registration agency plugin, so no surface; skipped.
//
// With WALK=neighbour it takes the control instead (the dropped kind last):
// OJS ticks only "Article galleys…" beside "Articles"; OPS ticks
// "Preprint galleys…" after "Preprints". The fix must leave that case as
// it is: the galley kind goes, the other stays ticked, the list shows.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js all shared/playwright/checks/issues/agency-choice-unticks-every-doi-kind/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=ir1 node bin/probe.js all shared/playwright/checks/issues/agency-choice-unticks-every-doi-kind/walk.js
// Facts: .reports/<feature>/ir1/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NEIGHBOUR = process.env.WALK === 'neighbour';

const KINDS = {
    ojs: {
        first: 'Articles',
        // the boxes pressed in step 3, in order
        walk: ['Article galleys, such as a published PDF', 'Peer Review'],
        neighbour: ['Article galleys, such as a published PDF'],
        list: 'Articles',
    },
    ops: {
        first: 'Preprints',
        walk: ['Preprints', 'Preprint galleys, such as a published PDF', 'Preprints'],
        neighbour: ['Preprint galleys, such as a published PDF'],
        list: 'Preprints',
    },
};

forEachApp(async (app) => {
    const kinds = KINDS[app.name] && {...KINDS[app.name]};
    if (kinds && app.name === 'ojs' && app.line === 'stable-3_5_0') kinds.walk = ['Article galleys, such as a published PDF', 'Issues'];
    if (!kinds) {
        console.log(`[walk] ${app.name}: no registration agency plugin, no surface; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {DoiSettings} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const {table, id, settings: settingsTable} = app.contextTables;
    const cid = sql(app, `select ${id} from ${table} where path='${app.contextPath}'`);
    const stored = () => sql(app, `select setting_value from ${settingsTable} where ${id}=${cid} and setting_name='enabledDoiTypes'`);
    const facts = {app: app.name, line: app.line || 'main', mode: NEIGHBOUR ? 'neighbour' : 'walk', fix: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const name = (s) => `${NEIGHBOUR ? 'nb-' : ''}${s}`;

    const {page, close} = await launch(app);
    const consoleErrors = [];
    page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text().split('\n')[0].slice(0, 300));
    });
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e.message).slice(0, 300)}`));

    const doisPage = async (label) => {
        consoleErrors.length = 0;
        await page.goto('about:blank');
        await page.goto(`/index.php/${app.contextPath}/dois`);
        await expect(page.locator('h1.app__pageHeading')).toBeVisible({timeout: T});
        await idle(page);
        await sleep(1500);
        const main = page.locator('main');
        const s = await screen(page);
        record(name(label), s);
        await shot(page, name(label)).catch(() => {});
        return {
            tabs: (await main.getByRole('tab').allInnerTexts()).map((t) => t.trim()),
            listPanels: await main.locator('.doiListPanel').count(),
            searchBoxes: await main.getByRole('searchbox').count(),
            items: await main.locator('.listPanel__item--doi').count(),
            emptyLine: await main.locator('.listPanel__empty').count(),
            filtersHeading: await main.getByText('Filters', {exact: true}).count(),
            consoleErrors: [...consoleErrors],
            mainText: s.text && s.text.main ? String(s.text.main).replace(/\s+/g, ' ').slice(0, 400) : null,
        };
    };

    try {
        // 1
        await signIn(page, 'dbarnes');
        const settings = new DoiSettings(page, app.contextPath);
        fact('0 stored before', stored());

        // 2
        await settings.gotoPlugins('crossrefplugin');
        await settings.setPluginEnabled('crossrefplugin', true);
        fact('2 crossref enabled', await settings.pluginBox('crossrefplugin').isChecked());

        // 3
        await settings.goto('Setup');
        fact('3 kinds shown before', await settings.kinds());
        for (const label of NEIGHBOUR ? kinds.neighbour : kinds.walk) {
            await settings.kindBox(label).click();
        }
        fact('3 kinds ticked', await settings.kinds());
        await settings.prefixBox().fill('10.1234');
        const r3 = await settings.pressSave(settings.setup);
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        fact('3 save', {status: r3.status()});
        fact('3 stored', stored());
        record(name('3-setup-saved'), await screen(page));

        // 4
        fact('4 dois page before agency', await doisPage('4-dois-before'));

        // 5
        await settings.goto('Registration');
        await settings.chooseAgency('Crossref');
        await expect(settings.field('depositorName')).toBeVisible({timeout: T});
        await settings.field('depositorName').fill('Public Knowledge Project');
        await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
        const r5 = await settings.pressSave(settings.registration);
        await expect(settings.savedStatus(settings.registration)).toBeVisible({timeout: T});
        fact('5 save', {status: r5.status(), body: (await r5.text().catch(() => '')).slice(0, 400)});
        fact('5 stored', stored());
        fact('5 registrationAgency stored', sql(app, `select setting_value from ${settingsTable} where ${id}=${cid} and setting_name='registrationAgency'`));

        // 6
        await settings.goto('Setup');
        await idle(page);
        fact('6 kinds shown after reload', await settings.kinds());
        record(name('6-setup-after'), await screen(page));
        await shot(page, name('6-setup-after')).catch(() => {});

        // 7
        fact('7 dois page after agency', await doisPage('7-dois-after'));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
