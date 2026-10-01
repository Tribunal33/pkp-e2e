// Issue report docs/issues/U45-A19-agency-choice-unticks-every-doi-kind.md (U45 A19):
// the way round on screen, on the dataset fleet walk.js left (no reset in
// between). As `dbarnes`: Settings › Distribution › "DOIs" › "Setup", tick
// the kinds again (OJS "Articles" then "Peer Review"; OPS "Preprints"),
// "Save"; then the DOIs page. Reads the stored `enabledDoiTypes` after the save.
// Run: PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js all shared/playwright/checks/issues/agency-choice-unticks-every-doi-kind/wayround.js
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BOXES = {ojs: ['Articles', 'Peer Review'], ops: ['Preprints']};

forEachApp(async (app) => {
    if (!BOXES[app.name]) return;
    if (!app.dataset) throw new Error('wayround.js runs on a dataset fleet left by walk.js');
    const {DoiSettings} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const {table, id, settings: settingsTable} = app.contextTables;
    const cid = sql(app, `select ${id} from ${table} where path='${app.contextPath}'`);
    const stored = () => sql(app, `select setting_value from ${settingsTable} where ${id}=${cid} and setting_name='enabledDoiTypes'`);
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const {page, close} = await launch(app);
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().split('\n')[0].slice(0, 300)));
    try {
        await signIn(page, 'dbarnes');
        const settings = new DoiSettings(page, app.contextPath);
        fact('stored before', stored());
        await settings.goto('Setup');
        fact('kinds shown', await settings.kinds());
        const posted = [];
        page.on('request', (r) => {
            if (/\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.method() !== 'GET') posted.push((r.postData() || '').slice(0, 600));
        });
        for (const label of BOXES[app.name]) {
            await settings.kindBox(label).click();
            fact(`after ticking ${label}`, await settings.kinds());
        }
        const r = await settings.pressSave(settings.setup);
        await sleep(1500);
        fact('save', {status: r.status(), body: (await r.text().catch(() => '')).slice(0, 300), posted, saved: await settings.savedStatus(settings.setup).count()});
        fact('stored after', stored());
        record('wayround-setup', await screen(page));

        errors.length = 0;
        await page.goto('about:blank');
        await page.goto(`/index.php/${app.contextPath}/dois`);
        await expect(page.locator('h1.app__pageHeading')).toBeVisible({timeout: T});
        await idle(page);
        await sleep(1500);
        const main = page.locator('main');
        fact('dois page', {
            listPanels: await main.locator('.doiListPanel').count(),
            items: await main.locator('.listPanel__item--doi').count(),
            consoleErrors: [...errors],
        });
        record('wayround-dois', await screen(page));
    } finally {
        record('wayround-facts', facts);
        await close();
    }
});
