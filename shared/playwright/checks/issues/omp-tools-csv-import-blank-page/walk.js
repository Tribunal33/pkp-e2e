// Issue report walk: docs/issues/omp-tools-csv-import-blank-page.md
// (spec U63 register OMP1). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own press `publicknowledge` and its manager `rvaca`. The kit builds
// nothing.
//   steps: rvaca signs in, opens "Tools" from the side menu, the
//      "Import/Export" tab's list is read, "Tab Delimited Content Import
//      Plugin" is pressed and the page it opens is read (status, heading,
//      trail, text, and the server log lines the request wrote)
//   control: back on Tools, "Native XML Plugin" is pressed; Settings ›
//      Website › Plugins, the "Tab Delimited Content Import Plugin" row's
//      actions are read
// On OJS and OPS only the Tools list is read (no such tool there).
// Records every screen with screen().
//
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63omp1 node bin/probe.js all shared/playwright/checks/issues/omp-tools-csv-import-blank-page/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u63omp1 node bin/probe.js all shared/playwright/checks/issues/omp-tools-csv-import-blank-page/walk.js
// Fix trial:    shared/playwright/checks/issues/omp-tools-csv-import-blank-page/trial.sh
// Facts: .reports/<feature>/u63omp1/facts[-<run>]-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const CSV = 'Tab Delimited Content Import Plugin';

function serverLog(app) {
    const f = path.join(__dirname, '../../../../../apps', app.name, 'playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    return {
        f,
        size: () => (fs.existsSync(f) ? fs.statSync(f).size : 0),
        since(off) {
            if (!fs.existsSync(f)) return [];
            const buf = fs.readFileSync(f).subarray(off).toString('utf8');
            return buf.split('\n').filter((l) => /PHP|Fatal|Smarty|Exception|\[500\]/.test(l)).map((l) => l.slice(0, 600)).slice(0, 12);
        },
    };
}

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    const ctx = app.contextPath;
    const loc = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    const cu = (p) => app.url(`/index.php/${ctx}${loc}${p}`);
    const log = serverLog(app);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    try {
        // 1. Sign in as rvaca.
        await signIn(page, 'rvaca');
        // 2. "Tools" from the side menu.
        await page.goto(cu('/submissions'));
        await idle(page);
        const toolsLink = page.getByRole('link', {name: 'Tools', exact: true}).first();
        fact('side menu has Tools', await toolsLink.count());
        await toolsLink.click();
        await page.waitForURL(/management\/tools/, {timeout: T});
        await idle(page);
        const list = page.locator('.pkp_page_importexport_plugins');
        await list.first().waitFor({timeout: T});
        await idle(page); await pause(300);
        await snap('tools-importexport');
        const items = (await list.locator('li').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
        fact('Tools › Import/Export list', items);
        if (app.name !== 'omp') {
            fact('has the tool', items.some((x) => x.startsWith(CSV)));
            return;
        }
        // 3. Press "Tab Delimited Content Import Plugin".
        const off = log.size();
        const w = page.waitForResponse((r) => /importexport\/plugin\/CSVImportExportPlugin/.test(r.url()) && r.request().resourceType() === 'document', {timeout: T}).catch(() => null);
        await list.getByRole('link', {name: CSV, exact: true}).click();
        const r = await w;
        await page.waitForLoadState('load').catch(() => {});
        await idle(page); await pause(500);
        const s = await snap('csv-tool-pressed');
        await shot(page, 'csv-tool-pressed');
        await pause(300);
        fact('CSV tool page', {
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            status: r ? r.status() : null,
            bodyLength: r ? (await r.body().catch(() => Buffer.alloc(0))).length : null,
            title: await page.title(),
            h1: await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null),
            trail: await page.locator('nav.app__breadcrumbs, .app__breadcrumbs').first().innerText({timeout: 2000}).then((x) => x.replace(/\s+/g, ' ').trim()).catch(() => null),
            text: (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 600),
            screenMain: (s.text && (s.text.main || '')).slice(0, 300),
        });
        fact('server log lines', log.since(off));
        // Control: Native XML Plugin from the same list.
        await page.goto(cu('/management/tools'));
        await idle(page);
        await list.first().waitFor({timeout: T});
        await list.getByRole('link', {name: 'Native XML Plugin', exact: true}).click();
        await page.waitForURL(/NativeImportExportPlugin/, {timeout: T});
        await idle(page); await pause(300);
        await snap('native-tool-pressed');
        fact('control: Native XML Plugin page', {
            h1: await page.locator('h1').first().innerText().catch(() => null),
            trail: await page.locator('nav.app__breadcrumbs, .app__breadcrumbs').first().innerText().then((x) => x.replace(/\s+/g, ' ').trim()).catch(() => null),
        });
        // Control: the Plugins list row.
        await page.goto(cu('/management/settings/website'));
        await idle(page);
        await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click().catch(() => page.locator('a[name="plugins"], #plugins-button').first().click());
        const row = page.locator('tr').filter({hasText: CSV}).first();
        await row.waitFor({timeout: T});
        await idle(page); await pause(300);
        await snap('plugins-list');
        const arrow = row.locator('a.show_extras, .show_extras');
        if (await arrow.count()) { await arrow.first().click().catch(() => {}); await pause(300); }
        const next = row.locator('xpath=following-sibling::tr[1]');
        fact('control: Plugins row', {
            row: (await row.innerText()).replace(/\s+/g, ' ').trim(),
            arrow: await arrow.count(),
            actions: (await next.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200),
            importExportData: await next.getByText('Import/Export Data', {exact: true}).count().catch(() => 0),
        });
        await signOut(page);
    } finally {
        record('facts', facts);
        await close();
    }
});
