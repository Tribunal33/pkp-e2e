// Issue report walk: docs/issues/U09-A12-static-pages-disabled-tab-add-server-error.md
// (spec U09 register A12). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the manager `rvaca` ticks "Static Pages Plugin" on Settings › Website ›
// "Plugins", reloads, unticks it again ("OK" on the "Disable" question), then,
// without reloading, opens the tab "Static Pages" still on the page and
// presses "Add Static Page"; then reloads (the control: the tab is gone).
// Step numbers are the report's. The kit builds nothing. Records every screen
// with screen(), the "add-static-page" request's status and answer, the
// server log lines that request wrote, and the "Error" window's text.
//
// `neighbour` as the argument walks the neighbour check for the fix instead:
// with the plugin ticked (and the page reloaded), "Add Static Page" opens its
// window "Add Static Page" with 200, the tab's grid loads with 200; a page
// address no handler serves still answers the page router's 404. Walked with
// the fix in and out, the two must read the same.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   ONLY=ojs,omp PROBE_FEATURE=issues-ir1 PROBE_AGENT=u09a12 node bin/probe.js all shared/playwright/checks/issues/static-pages-disabled-tab-add-server-error/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//   ONLY=ojs,omp PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u09a12 node bin/probe.js all shared/playwright/checks/issues/static-pages-disabled-tab-add-server-error/walk.js
//   (OPS has no Static Pages plugin; the script skips it)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');
const REPO = path.resolve(__dirname, '../../../../..');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    if (app.name === 'ops') { console.log('[ops] no Static Pages plugin: skipped'); return; }
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : 'steps'};
    const SUF = NEIGHBOUR ? '-nb' : '';
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const port = new URL(app.baseURL).port;
    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (off) => {
        try {
            const buf = fs.readFileSync(logFile);
            return buf.subarray(off).toString('utf8').split('\n').filter((l) => /error|exception|warning|fatal/i.test(l)).map((l) => flat(l, 600)).slice(0, 8);
        } catch { return ['(no log file ' + logFile + ')']; }
    };

    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push({kind: 'pageerror', text: flat(e.message)}));
    page.on('console', (m) => { if (m.type() === 'error') scriptErrors.push({kind: 'console', text: flat(m.text())}); });

    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${SUF}`, {...s, ...extra}); return s; };

    const websiteURL = app.url(`/index.php/${app.contextPath}/en/management/settings/website`);
    const pluginRow = () => page.locator('tr.gridRow[id$="-row-staticpagesplugin"]').first();
    const openWebsite = async () => { await page.goto(websiteURL); await idle(page); };
    const openTab = async (id) => { await page.locator(`#${id}-button`).first().click(); await idle(page); await pause(500); };
    const openPlugins = async () => {
        await openTab('plugins');
        await pluginRow().waitFor({timeout: T});
    };
    const toggle = async (want) => {
        const box = pluginRow().getByRole('checkbox').first();
        await loc(page, 'Plugins: the "Static Pages Plugin" checkbox', box);
        if ((await box.isChecked()) === want) return {already: true};
        const w = page.waitForResponse((r) => /plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        let question = null;
        if (!want) {
            const dlg = page.locator('[role="dialog"]:visible').filter({hasText: 'Are you sure you want to disable this plugin?'}).last();
            await dlg.waitFor({timeout: T});
            question = flat(await dlg.innerText());
            await snap('disable-question');
            const ok = dlg.getByRole('button', {name: 'OK', exact: true}).first();
            await loc(page, 'Disable window: OK', ok);
            await ok.click();
        }
        const r = await w;
        await pause(1000); await idle(page);
        const s = await snap(want ? 'enabled' : 'disabled');
        return {status: r ? r.status() : null, question, checked: await box.isChecked(), notices: s.notices};
    };
    const tabs = async () => page.locator('[role="tab"]:visible').allInnerTexts().then((a) => a.map((t) => flat(t, 60)));
    const pressAdd = async () => {
        await openTab('staticPages');
        await page.locator('#staticPageGridContainer').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        const add = page.locator('#staticPageGridContainer').getByRole('link', {name: 'Add Static Page', exact: true}).first();
        await loc(page, 'Static Pages tab: "Add Static Page"', add);
        await snap('static-pages-tab');
        const off = logSize(); const e0 = scriptErrors.length;
        const w = page.waitForResponse((r) => /add-static-page/.test(r.url()), {timeout: T}).catch(() => null);
        await add.click();
        const r = await w;
        let answer = null;
        if (r) { try { answer = flat(await r.text(), 300); } catch { answer = null; } }
        await pause(2000); await idle(page).catch(() => {});
        const dialogs = await page.locator('[role="dialog"]:visible').evaluateAll((ds) => ds.map((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 200)));
        await snap('after-add');
        return {
            request: r ? `${r.request().method()} ${r.url().replace(app.baseURL, '')}` : null,
            status: r ? r.status() : null, answer, dialogs,
            serverLog: logSince(off), scriptErrors: scriptErrors.slice(e0),
        };
    };
    const closeDialogs = async () => {
        for (let i = 0; i < 3; i++) {
            const top = page.locator('[role="dialog"]:visible').last();
            if (!(await top.count())) break;
            const ok = top.getByRole('button', {name: 'OK', exact: true});
            if (await ok.count()) await ok.first().click().catch(() => {});
            else await top.getByRole('button', {name: /close|cancel/i}).first().click().catch(() => {});
            await pause(800);
        }
    };

    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});                       // 1
        await openWebsite();                                                               // 2
        await openPlugins();
        await snap('plugins');
        fact('tabs-at-start', await tabs());
        fact('step3-tick', await toggle(true));                                           // 3
        await openWebsite();                                                               // 4
        fact('step4-tabs', await tabs());
        if (!NEIGHBOUR) {
            await openPlugins();
            fact('step5-untick', await toggle(false));                                    // 5
            fact('step6-tabs', await tabs());                                              // 6
            fact('step7-add', await pressAdd());                                           // 7
            await closeDialogs();
            await openWebsite();                                                           // 8
            fact('step8-tabs-after-reload', await tabs());
            await snap('reloaded');
        } else {
            fact('nb-add-enabled', await pressAdd());
            await closeDialogs();
            const off = logSize();
            const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/nosuchpageu09a12`));
            fact('nb-unknown-page', {status: r ? r.status() : null, text: flat(await page.locator('body').innerText().catch(() => ''), 120), serverLog: logSince(off)});
            await snap('unknown-page');
        }
        fact('script-errors-all', scriptErrors);
        await signOut(page);
    } finally {
        record(`facts${SUF}`, facts);
        await close();
    }
});
