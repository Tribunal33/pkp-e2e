// Issue report walk: docs/issues/U63-A1-tools-absent-tool-address-raw-json.md
// (spec U63 register A1). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge` and its manager `rvaca`. The kit
// builds nothing and the walk changes nothing in the data.
//   steps: rvaca signs in, opens "Tools" from the side menu and reads the
//      "Import/Export" tab's list, then types the address of a tool this
//      application lacks (OMP: CrossrefExportPlugin; OJS, OPS:
//      Onix30ExportPlugin) and reads what answers (status, content type,
//      heading, menu, text)
//   control: the address of a tool the installation has
//      (NativeImportExportPlugin) opens its page
//   reach: `…/management/tools/<unknown>` (the sibling router), read the
//      same way
// Records every screen with screen().
//
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63a1 node bin/probe.js all shared/playwright/checks/issues/tools-absent-tool-address-raw-json/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u63a1 node bin/probe.js all shared/playwright/checks/issues/tools-absent-tool-address-raw-json/walk.js
// Fix trial:    shared/playwright/checks/issues/tools-absent-tool-address-raw-json/trial.sh
// Facts: .reports/<feature>/u63a1/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const ABSENT = {ojs: 'Onix30ExportPlugin', omp: 'CrossrefExportPlugin', ops: 'Onix30ExportPlugin'};

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    const loc = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    const cu = (p) => app.url(`/index.php/${app.contextPath}${loc}${p}`);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    // Types an address and reads what answers.
    const typed = async (label, p) => {
        const r = await page.goto(cu(p));
        await page.waitForLoadState('load').catch(() => {});
        await idle(page); await pause(300);
        const body = r ? (await r.body().catch(() => Buffer.alloc(0))).toString('utf8') : '';
        await snap(label);
        await shot(page, label);
        fact(label, {
            address: p,
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            status: r ? r.status() : null,
            contentType: r ? r.headers()['content-type'] || null : null,
            bodyLength: body.length,
            bodyStart: body.slice(0, 260),
            title: await page.title(),
            h1: await page.locator('h1').first().innerText({timeout: 1500}).catch(() => null),
            links: await page.locator('a').count(),
            sideMenu: await page.getByRole('link', {name: 'Tools', exact: true}).count(),
            text: (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 400),
        });
    };
    try {
        // 1. Sign in as rvaca.
        await signIn(page, 'rvaca');
        // 2. "Tools" from the side menu; the "Import/Export" tab's list.
        await page.goto(cu('/submissions'));
        await idle(page);
        const toolsLink = page.getByRole('link', {name: 'Tools', exact: true}).first();
        await toolsLink.click();
        await page.waitForURL(/management\/tools/, {timeout: T});
        await idle(page);
        const list = page.locator('.pkp_page_importexport_plugins');
        await list.first().waitFor({timeout: T});
        await idle(page); await pause(300);
        await snap('tools-importexport');
        const items = (await list.locator('li').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim().split(':')[0]);
        fact('Tools › Import/Export list', items);
        // 3. Type the address of a tool this application lacks.
        await typed('absent-tool', `/management/importexport/plugin/${ABSENT[app.name]}`);
        // Control: a tool the installation has.
        await typed('control-native', '/management/importexport/plugin/NativeImportExportPlugin');
        // Reach: the sibling router's unknown path.
        await typed('reach-tools-unknown', '/management/tools/u63a1NoSuchTab');
        await signOut(page);
    } finally {
        record('facts', facts);
        await close();
    }
});
