// Neighbour check for docs/issues/U63-OMP1-omp-tools-csv-import-blank-page.md
// (spec U63 register OMP1), walked with fix.diff in and out (trial.sh).
// The fix adds the plugin's missing page; it must not reach further:
//   - `sberardo` (Series editor, not manager-level) types the tool page's
//     address: it stays refused, as it is for "Native XML Plugin"
//   - `rvaca` on Settings › Website › Plugins: the "Tab Delimited Content
//     Import Plugin" row still offers no "Import/Export Data" (the tool
//     stays command-line only)
// OMP only (no such tool on OJS or OPS). Records every screen with screen().
// Run: flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63omp1 PROBE_RUN=<fix|nofix> node bin/probe.js omp shared/playwright/checks/issues/omp-tools-csv-import-blank-page/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const CSV = 'Tab Delimited Content Import Plugin';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`nb-${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    try {
        await signIn(page, 'sberardo');
        for (const plugin of ['CSVImportExportPlugin', 'NativeImportExportPlugin']) {
            const r = await page.goto(cu(`/management/importexport/plugin/${plugin}`));
            await idle(page); await pause(300);
            const s = await snap(`sberardo-${plugin}`);
            fact(`sberardo types ${plugin}`, {
                status: r ? r.status() : null,
                url: page.url().replace(/^https?:\/\/[^/]+/, ''),
                h1: await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null),
                text: `${s.text.main || ''}`.replace(/\s+/g, ' ').trim().slice(0, 300),
            });
        }
        await signOut(page);
        await signIn(page, 'rvaca');
        await page.goto(cu('/management/settings/website'));
        await idle(page);
        await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click().catch(() => page.locator('#plugins-button').first().click());
        const row = page.locator('tr').filter({hasText: CSV}).first();
        await row.waitFor({timeout: T});
        await idle(page); await pause(300);
        await snap('rvaca-plugins-list');
        fact('rvaca Plugins row', {
            row: (await row.innerText()).replace(/\s+/g, ' ').trim(),
            arrow: await row.locator('a.show_extras, .show_extras').count(),
            importExportData: await row.getByText('Import/Export Data').count(),
        });
        await signOut(page);
    } finally {
        record('nb-facts', facts);
        await close();
    }
});
