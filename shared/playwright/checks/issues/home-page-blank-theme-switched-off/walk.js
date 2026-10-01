// Issue report walk: docs/issues/U62-OJS1-home-page-blank-theme-switched-off.md
// (spec U62 register OJS1). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
//   1 sign in as `rvaca`; 2 Settings › Website › "Plugins"; 3 untick
//   "Default Theme"; 4 "OK" in the "Disable" window; 5 the home page, signed
//   in and as a visitor; 6 "About the Journal" (control).
// Neighbour (run with the fix in and out): 7 tick "Default Theme" again;
// 8 the home page is styled and holds the same content as before step 3.
// Each page load records its status, title, the theme's style sheets, the
// body font, the text's length and head, and the lines it added to the
// server log. The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-v01 --dataset 1 --reset
//   PROBE_FEATURE=issues-v01 PROBE_AGENT=v01 node bin/probe.js all shared/playwright/checks/issues/home-page-blank-theme-switched-off/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-v01-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-v01-3_5 PROBE_AGENT=v01 node bin/probe.js all shared/playwright/checks/issues/home-page-blank-theme-switched-off/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/v01/facts[-<run>]-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));

function tail(file) {
    const size = () => { try { return fs.statSync(file).size; } catch { return 0; } };
    const from = size();
    return () => {
        try {
            return fs.readFileSync(file).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|ERROR|Error|Exception|\[5\d\d\]/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const ctx = app.contextPath;
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const serverLog = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    let n = 0;

    /** Load an address and read it as a reader would see it. */
    const look = async (page, name, address) => {
        const sl = tail(serverLog);
        let status = null;
        try { const r = await page.goto(app.url(address)); status = r && r.status(); } catch (e) { status = flat(e.message, 100); }
        await idle(page).catch(() => {});
        const o = await page.evaluate(() => ({
            sheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href').replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')),
            bodyFont: document.body ? getComputedStyle(document.body).fontFamily : null,
            text: document.body ? document.body.innerText.replace(/\s+/g, ' ').trim() : '',
            html: document.documentElement ? document.documentElement.outerHTML.length : 0,
        })).catch((e) => ({error: flat(e.message, 200), text: ''}));
        const s = await screen(page).catch(() => ({}));
        const name2 = `${String(++n).padStart(2, '0')}-${name}`;
        record(name2, {...s, status, ...o});
        await shot(page, name2).catch(() => {});
        await sleep(300);
        const out = {status, title: await page.title().catch(() => null), themeSheets: o.sheets.filter((h) => /default|stylesheet/i.test(h)), bodyFont: flat(o.bodyFont, 40), htmlLength: o.html, textLength: o.text.length, textHead: flat(o.text, 220), serverLog: sl()};
        fact(name, out);
        return {...out, text: o.text};
    };

    /** Settings › Website › "Plugins", then press the "Default Theme" box and answer the window. */
    const pressThemeBox = async (page, name) => {
        await page.goto(app.url(`/index.php/${ctx}/management/settings/website`));
        await idle(page);
        await page.locator('#plugins-button').first().click();
        await idle(page);
        const row = page.locator('tr.gridRow[id$="-row-defaultthemeplugin"]').first();
        await row.waitFor({timeout: T});
        const box = row.locator('input[type=checkbox]').first();
        const o = {category: flat(await row.locator('xpath=ancestor::tbody[1]/tr[1]').innerText().catch(() => null), 60), label: flat(await row.locator('td .label').first().innerText().catch(() => null), 60), before: await box.isChecked()};
        await box.click({noWaitAfter: true});
        await sleep(700);
        const dlg = page.locator('[role="dialog"]:visible').last();
        if (await dlg.count()) {
            o.window = flat(await dlg.innerText().catch(() => ''), 300);
            await dlg.getByRole('button', {name: 'OK', exact: true}).first().click();
        }
        await idle(page).catch(() => {});
        await sleep(800);
        const s = await screen(page);
        o.notices = s.notices;
        o.after = await box.isChecked().catch(() => null);
        const name2 = `${String(++n).padStart(2, '0')}-${name}`;
        record(name2, {...s, ...o});
        await shot(page, name2).catch(() => {});
        fact(name, o);
        return o;
    };

    const {page, close} = await launch(app);
    try {
        const before = await look(page, 'home-before', `/index.php/${ctx}`);       // the home page as the dataset has it
        await signIn(page, 'rvaca');                                                // 1
        await idle(page);
        await pressThemeBox(page, 'untick-default-theme');                          // 2, 3, 4
        await look(page, 'home-theme-off-signed-in', `/index.php/${ctx}`);   // 5
        let home;
        const {page: visitor, close: closeVisitor} = await launch(app);
        try { home = await look(visitor, 'home-theme-off-visitor', `/index.php/${ctx}`); } finally { await closeVisitor(); }
        await look(page, 'about-theme-off', `/index.php/${ctx}/about`);           // 6, control
        await pressThemeBox(page, 'tick-default-theme-again');                      // 7, neighbour
        let restored;
        const {page: visitor2, close: closeVisitor2} = await launch(app);
        try { restored = await look(visitor2, 'home-theme-on-again-visitor', `/index.php/${ctx}`); } finally { await closeVisitor2(); }   // 8
        fact('summary', {
            homeThemeOff: home.status,
            homeThemeOffHasJournalName: /Public Knowledge/.test(home.text),
            homeThemeOffShowsCurrentIssue: /Vol\. 1 No\. 2 \(2014\)/.test(home.text),
            homeRestoredStatus: restored.status,
            homeRestoredStyled: restored.themeSheets.length > 0,
            homeRestoredSameTextAsBefore: restored.text === before.text,
            homeRestoredShowsCurrentIssue: /Vol\. 1 No\. 2 \(2014\)/.test(restored.text),
            homeRestoredTextLength: restored.textLength, homeBeforeTextLength: before.textLength,
        });
    } finally {
        record('facts', facts);
        await close();
    }
});
