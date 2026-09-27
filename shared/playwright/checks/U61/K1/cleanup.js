// U61 K1 cleanup: when k1.js had to seed a failed job of its own for the Failed Job
// Details trail (the list was empty), delete that one row on Administration ›
// "View Failed Jobs" by its id, so the fleet is left with no failed job of ours.
// Run only after chunk K3 has returned (it owns that page's buttons).
// Run: PROBE_FEATURE=U61 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U61/K1/cleanup.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, outDir} = require('../../../probe');

forEachApp(async (app) => {
    const f = path.join(outDir(), `k1-state-${app.name}.json`);
    const st = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    const id = st.ownFailedJob && st.ownFailedJob.id;
    if (!id) { console.log(`[cleanup] ${app.name}: no failed job of ours`); return; }
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/en/admin/failedJobs'));
        await idle(page);
        const row = page.locator('tr').filter({has: page.locator('td', {hasText: new RegExp(`^\\s*${id}\\s*$`)})}).first();
        const before = await screen(page);
        if (!(await row.count())) { record('cleanup', {id, found: false, before}); return; }
        const resp = page.waitForResponse((r) => /\/jobs\/failed\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await row.getByRole('button', {name: 'Delete'}).click();
        const r = await resp;
        await idle(page);
        const after = await screen(page);
        await page.reload(); await idle(page);
        const reloaded = await screen(page);
        record('cleanup', {id, found: true, status: r ? r.status() : null, afterText: after.text.main.slice(0, 600), reloadedHasRow: new RegExp(`\\b${id}\\b.*queuedTestJob`).test(reloaded.text.main)});
        await signOut(page);
    } finally { await close(); }
});
