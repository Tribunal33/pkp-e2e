// Issue report for U10 A5: a style sheet removed under Settings › Website › "Appearance" › "Advanced" stops loading on
// the pages, but its file stays public at its old address. Takes the report's Steps on PKP's default test dataset
// (a dataset fleet), as `rvaca`:
//   WALK=steps (default)  "Advanced": "Upload File" u10c-style.css under the style sheet box and u10c-favicon.png under
//                         "Favicon", "Save" (step 3); the page reloaded, the stored addresses read (step 4); "Remove" under
//                         both, "Save" (step 5); signed out, the home page's head (step 6); both addresses opened (step 7).
//   WALK=nb               the neighbour (fix in and out): "Upload File" u10c-style.css, "Save"; reloaded, "Save" again
//                         untouched; signed out, the address opened; signed in, "Remove" and "Upload File"
//                         u10c-style-2.css in one go, "Save"; signed out, the address opened again (the new file).
// Each step records what it saw and never throws on a state the fix changes.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u10c --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u10c PROBE_AGENT=u10c node bin/probe.js all shared/playwright/checks/issues/removed-style-sheet-stays-public/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u10c-3_5 PROBE_AGENT=u10c node bin/probe.js all shared/playwright/checks/issues/removed-style-sheet-stays-public/walk.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, outFile, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const name = (s) => `a5-${MODE}-${s}`;
    const files = L.makeFiles(path.dirname(outFile('files.txt')));
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    page.on('dialog', (d) => {
        fact(`dialog ${Object.keys(facts.steps).length}`, {type: d.type(), message: d.message()});
        d.accept().catch(() => null);
    });
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out || {});
            return out;
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
            return null;
        } finally {
            await idle(page).catch(() => null);
        }
    };
    const css = L.box(page, 'appearanceAdvanced', 'styleSheet', null);
    const fav = L.box(page, 'appearanceAdvanced', 'favicon', 'en');
    const advanced = async () => {
        await L.openAppearance(page, app, 'advanced');
        await css.field.waitFor({timeout: L.T});
    };
    const home = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}`));
        await idle(page);
        const links = await page.locator('link[rel="stylesheet"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
        return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), styleSheetLinks: links.filter((h) => /styleSheet/.test(h))};
    };
    const log = serverLog(app);
    try {
        await step('1 sign in as rvaca', async () => { await signIn(page, 'rvaca'); return {url: page.url()}; });
        if (MODE === 'steps') {
            await step('2 Appearance › Advanced', async () => { await advanced(); return {css: await L.boxState(page, css)}; });
            await step('3 Upload File u10c-style.css and u10c-favicon.png, Save', async () => {
                const a = await L.pressUploadFile(page, css, files.css);
                const b = await L.pressUploadFile(page, fav, files.png);
                return {css: a, favicon: b, ...(await L.save(page, css))};
            });
            const stored = await step('4 reload, Advanced: the stored addresses', async () => { await advanced(); return L.storedAddresses(page); });
            record(name('stored'), await screen(page));
            await step('4b signed in: home page head', home);
            await step('5 Remove both, Save', async () => {
                await advanced();
                const from = log.mark();
                const a = await L.pressRemove(css);
                const b = await L.pressRemove(fav);
                const s = await L.save(page, css);
                await L.sleep(500);
                return {css: a, favicon: b, ...s, serverLog: log.since(from)};
            });
            await step('5b reload, Advanced: what the boxes show', async () => {
                await advanced();
                return {css: await L.boxState(page, css), stored: await L.storedAddresses(page)};
            });
            record(name('after-remove'), await screen(page));
            await step('6 sign out, home page head', async () => { await signOut(page); return home(); });
            await step('7 open the style sheet address', async () => L.openAddress(page, stored && stored.styleSheet && stored.styleSheet.href));
            record(name('stylesheet-address'), await screen(page));
            await shot(page, name('stylesheet-address'));
            await step('7 open the favicon address (control)', async () => L.openAddress(page, stored && stored.favicon && stored.favicon.src));
        } else if (MODE === 'nb') {
            await step('nb Advanced, Upload File u10c-style.css, Save', async () => {
                await advanced();
                const a = await L.pressUploadFile(page, css, files.css);
                return {css: a, ...(await L.save(page, css))};
            });
            const stored = await step('nb reload, Save untouched', async () => {
                await advanced();
                const s = await L.storedAddresses(page);
                return {...s, ...(await L.save(page, css))};
            });
            const href = stored && stored.styleSheet && stored.styleSheet.href;
            await step('nb signed out: home page head and the address', async () => {
                await signOut(page);
                return {home: await home(), address: await L.openAddress(page, href)};
            });
            await step('nb sign in, Remove and Upload File u10c-style-2.css, Save', async () => {
                await signIn(page, 'rvaca');
                await advanced();
                const from = log.mark();
                const r = await L.pressRemove(css);
                const a = await L.pressUploadFile(page, css, files.css2);
                const s = await L.save(page, css);
                return {remove: r, css: a, ...s, serverLog: log.since(from)};
            });
            await step('nb reload: the stored addresses', async () => { await advanced(); return L.storedAddresses(page); });
            await step('nb signed out after the replacement: home page head and the address', async () => {
                await signOut(page);
                return {home: await home(), address: await L.openAddress(page, href)};
            });
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
