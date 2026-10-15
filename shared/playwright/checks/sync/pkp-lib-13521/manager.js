// PR review of pkp/pkp-lib#13521, finding 3 (docs/reports/2026-10-14-pkp-lib-13521.md): the steps a
// person follows. On PKP's default dataset, the Journal Manager `rvaca` signs in and types each
// site-level address below into the browser's address bar; the page shows the app's answer.
// Run once with the gate off (the default) and once with `[security] password_timeout = 1`.
//   Reset first: npm run fleet-prep -- --feature pr13520 --dataset 1 --reset
//   PROBE_FEATURE=pr13520 PROBE_AGENT=<base|head> node bin/probe.js all shared/playwright/checks/sync/pkp-lib-13521/manager.js
// Facts: .reports/pr13520/<agent>/manager-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('../../issues/admin-changes-skip-confirm-access/lib.js');

const ADDRESSES = [
    '/index.php/index/api/v1/announcements',
    '/index.php/index/api/v1/highlights',
    '/index.php/index/api/v1/site',
    '/index.php/index/$$$call$$$/grid/navigation-menus/navigation-menus-grid/fetch-grid',
    '/index.php/index/$$$call$$$/grid/admin/context/context-grid/fetch-grid',
    '/index.php/index/$$$call$$$/grid/admin/plugins/admin-plugin-grid/fetch-grid',
    '/index.php/index/$$$call$$$/grid/admin/languages/admin-language-grid/fetch-grid',
    '/index.php/index/api/v1/contexts',
];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('manager.js runs on a dataset fleet');
    const facts = {app: app.name};
    const cfg = L.setPasswordTimeout(app, 0);
    const {page, close} = await launch(app);
    try {
        for (const gate of [0, 1]) {
            L.setPasswordTimeout(app, gate);
            await signIn(page, 'rvaca', {contextPath: app.contextPath});
            const out = {};
            for (const address of ADDRESSES) {
                const r = await page.goto(app.url(address)).catch((e) => ({error: String(e)}));
                const text = await page.locator('body').innerText().catch(() => '');
                out[address] = {status: r.status ? r.status() : r.error, shown: L.flat(text, 300)};
            }
            facts[`gate ${gate ? 'on' : 'off'}`] = out;
        }
    } finally {
        record('manager', facts);
        cfg.restore();
        await close();
    }
});
