// Issue report walk: docs/issues/U52-A12-institutions-menu-stays-after-payments-off.md
// (spec U52 register A12). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets").
// OJS only: a press's "Payments" tab changes nothing in the side menu, and a
// preprint server has no "Payments" tab (U52 Rule 1, note td1).
//
// Arguments (after the script):
//   (none)      the Steps: as `rvaca`, Settings › Distribution › "Payments",
//               tick "Enable", "Save"; untick it, "Save"; reload.
//   neighbour   the fix check: with institutional statistics on (the site's
//               box as `admin`, the journal's as `rvaca`), payments on then
//               off must leave "Institutions" in the side menu; unticking the
//               journal's statistics box then drops it; payments on and off
//               again leave it out.
//
// The kit builds nothing. Every screen is recorded with screen(); the side
// menu's top entries after each action, each save's status and the new lines
// of the fleet's server log go into the facts.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/institutions-menu-stays-after-payments-off/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] the side menu takes no "Institutions" from the "Payments" tab on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {PaymentSettingsTab} = require('../../../pages/PaymentsPages.js');
    const {EditorialSideMenu} = require('../../../pages/SubscriptionsPages.js');
    const cp = app.contextPath;
    const label = `a12-${MODE}`;
    const facts = {label, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error|Notice|Deprecated)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };

    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push(String(e.message).slice(0, 300)));
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(app.baseURL, '')}`); });
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${label}-${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const side = new EditorialSideMenu(page);
    const tab = new PaymentSettingsTab(page, cp);
    /** The side menu's top entries that matter here, plus the full label list. */
    const menu = async () => {
        await pause(500); // let Vue re-render the menu after the save's event
        const labels = await side.labels();
        return {institutions: labels.includes('Institutions'), payments: labels.includes('Payments'), labels};
    };

    /** Settings › Distribution › "Payments": set "Enable", "Save"; the save, "Saved" and the side menu. */
    async function payments(enable, name, {open = true} = {}) {
        if (open === 'tab') {
            await page.locator('#payments-button').click();
            await tab.enableBox().waitFor({timeout: T});
        } else if (open) await tab.goto();
        const from = logSize();
        if (enable) await tab.enableBox().check(); else await tab.enableBox().uncheck();
        const r = await tab.save();
        await idle(page);
        const out = {status: r.status(), saved: await tab.savedStatus().isVisible(), enabled: await tab.enableBox().isChecked(), menu: await menu()};
        out.log = logSince(from);
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }

    /** Settings › Distribution › "Statistics" (or the site's): set "Enable institutional statistics", "Save". */
    async function statsBox(url, tick, name) {
        await page.goto(url);
        await idle(page);
        if (url.includes('/admin/')) await page.locator('#setup-button').first().click();
        await page.locator('#statistics-button').first().click();
        const panel = page.locator('#statistics');
        await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(400);
        const box = panel.getByLabel('Enable institutional statistics', {exact: true});
        const was = await box.isChecked();
        if (tick) await box.check(); else await box.uncheck();
        const w = page.waitForResponse((x) => /api\/v1\/(site|contexts)/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        await idle(page);
        const out = {was, now: await box.isChecked(), status: r ? r.status() : null, saved};
        if (url.includes('/management/')) out.menu = await menu();
        await snap(name, {walk: out});
        fact(name, out);
    }

    try {
        if (MODE === 'steps') {
            // 1. Sign in as rvaca.
            await signIn(page, 'rvaca', {contextPath: cp});
            // 2. Settings › Distribution › "Payments".
            await tab.goto();
            await idle(page);
            fact('02-tab-opened', {enabled: await tab.enableBox().isChecked(), menu: await menu()});
            await snap('tab-opened');
            // 3. Tick "Enable", "Save".
            await payments(true, '03-enable-saved', {open: false});
            // 4. Untick "Enable", "Save".
            await payments(false, '04-disable-saved', {open: false});
            // Settle: the menu read again two seconds on, still the same page.
            await pause(2000);
            fact('04b-two-seconds-on', await menu());
            // 5. Reload.
            await tab.reload();
            await idle(page);
            fact('05-reloaded', {enabled: await tab.enableBox().isChecked(), menu: await menu()});
            await snap('reloaded');
        } else {
            // Institutional statistics on: the site's box as admin, the journal's as rvaca.
            await signIn(page, 'admin');
            await statsBox(app.url(app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '/index.php/index/admin/settings' : '/index.php/index/en/admin/settings'), true, 'n1-site-statistics-on');
            await signIn(page, 'rvaca', {contextPath: cp});
            await statsBox(app.url(`/index.php/${cp}/en/management/settings/distribution`), true, 'n2-journal-statistics-on');
            // Payments on, then off: "Institutions" must stay (statistics are on).
            await payments(true, 'n3-enable-saved');
            await payments(false, 'n4-disable-saved', {open: false});
            await tab.reload();
            fact('n5-reloaded', await menu());
            // The journal's statistics box unticked on the same page: "Institutions" goes.
            await statsBox(app.url(`/index.php/${cp}/en/management/settings/distribution`), false, 'n6-journal-statistics-off');
            // Payments on and off again, same page: "Institutions" goes with "Payments".
            await payments(true, 'n7-enable-saved', {open: 'tab'});
            await payments(false, 'n8-disable-saved', {open: false});
            await tab.reload();
            fact('n9-reloaded', await menu());
        }
    } finally {
        fact('crashes', {serverErrors: failed, scriptErrors});
        record(`${label}-facts`, facts);
        await close();
    }
});
