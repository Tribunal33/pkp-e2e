// Neighbour check for docs/issues/tools-absent-tool-address-raw-json.md
// (spec U63 register A1), walked with fix.diff in and out (trial.sh).
// The fix answers "not found" for an import/export or Tools address naming
// nothing the installation has; it must not reach further:
//   - `rvaca` on Tools: the "Import/Export" tab still lists the tools (the
//     same handler serves that list), and the "Permissions" tab still loads
//   - `rvaca` on Settings › Website › Plugins: "Native XML Plugin"'s
//     "Import/Export Data" still opens the tool's page
//   - `sberardo` (a section editor, not manager-level) typing the absent
//     tool's address stays refused as before, not told "not found"
// Reach, read with the fix in and out: `…/importexport/plugin` with no
// name, `…/importexport/<other>`.
// Records every screen with screen().
// Run: flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63a1 PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/tools-absent-tool-address-raw-json/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const ABSENT = {ojs: 'Onix30ExportPlugin', omp: 'CrossrefExportPlugin', ops: 'Onix30ExportPlugin'};

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`nb-${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    const typed = async (label, p) => {
        const r = await page.goto(cu(p));
        await page.waitForLoadState('load').catch(() => {});
        await idle(page); await pause(300);
        const body = r ? (await r.body().catch(() => Buffer.alloc(0))).toString('utf8') : '';
        await snap(label);
        fact(label, {
            address: p,
            status: r ? r.status() : null,
            contentType: r ? r.headers()['content-type'] || null : null,
            bodyLength: body.length,
            title: await page.title(),
            h1: await page.locator('h1').first().innerText({timeout: 1500}).catch(() => null),
            text: (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 240),
        });
    };
    try {
        await signIn(page, 'rvaca');
        // Tools: both tabs.
        await page.goto(cu('/management/tools'));
        await idle(page);
        const list = page.locator('.pkp_page_importexport_plugins');
        await list.first().waitFor({timeout: T});
        await snap('tools-importexport');
        fact('Tools › Import/Export list', (await list.locator('li a').allInnerTexts()).map((x) => x.trim()));
        await page.getByRole('tab', {name: 'Permissions'}).first().click();
        await idle(page); await pause(500);
        const s = await snap('tools-permissions');
        fact('Tools › Permissions tab', `${s.text.main || ''}`.replace(/\s+/g, ' ').trim().slice(0, 200));
        // Plugins list: Native XML Plugin's "Import/Export Data".
        await page.goto(cu('/management/settings/website'));
        await idle(page);
        await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click();
        const row = page.locator('tr').filter({hasText: 'Native XML Plugin'}).first();
        await row.waitFor({timeout: T});
        await row.locator('a.show_extras').first().click();
        await page.getByRole('link', {name: 'Import/Export Data'}).first().click();
        await page.waitForURL(/importexport\/plugin\/NativeImportExportPlugin/, {timeout: T});
        await idle(page);
        await snap('plugins-native-importexport-data');
        fact('Plugins › Native XML Plugin › Import/Export Data', {
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            h1: await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null),
        });
        // Reach.
        await typed('reach-plugin-no-name', '/management/importexport/plugin');
        await typed('reach-other-path', '/management/importexport/u63a1Other');
        await signOut(page);
        // A section editor stays refused.
        await signIn(page, 'sberardo');
        await typed('sberardo-absent-tool', `/management/importexport/plugin/${ABSENT[app.name]}`);
        await signOut(page);
    } finally {
        record('nb-facts', facts);
        await close();
    }
});
