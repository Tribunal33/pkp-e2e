// Issue report for U10 A5, the site's half (U60 A6): a "Site style sheet" removed under Administration › Site Settings ›
// "Appearance" › "Setup" stops loading on the pages, but its file stays public at `/public/site/styleSheet.css`.
// Takes the report's site Steps on PKP's default test dataset (a dataset fleet), as `admin`. The dataset holds one
// context, so the "Appearance" tab needs a second one: step 2 creates it through Administration's "Create Journal".
//   WALK=steps (default)  2 "Create Journal" u60d; 3 Site Settings › Appearance › Setup; 4 "Upload File" u60d-site.css
//                         under "Site style sheet" and u60d-logo.png under "Logo", "Save"; 5 reloaded, the stored
//                         addresses read; 6 "Remove" under both, "Save"; 7 signed out, the site home page's head;
//                         8 both addresses opened.
//   WALK=nb               the neighbour (fix in and out): 2 as above; "Upload File" u60d-site.css, "Save"; reloaded,
//                         "Save" untouched; signed out, the address opened; signed in, "Remove" and "Upload File"
//                         u60d-site-2.css in one save; signed out, the address opened again (the new file).
// Each step records what it saw and never throws on a state the fix changes.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u60d --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u60d PROBE_AGENT=u60d node bin/probe.js all shared/playwright/checks/issues/removed-style-sheet-stays-public/site-walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u60d-3_5 PROBE_AGENT=u60d node bin/probe.js all shared/playwright/checks/issues/removed-style-sheet-stays-public/site-walk.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, outFile, serverLog} = require('../../../probe');
const L = require('./lib');
const {createContext} = require('../all-dates-error-nothing-published/lib');

const MODE = process.env.WALK || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('site-walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const name = (s) => `a6-site-${MODE}-${s}`;
    const files = L.makeSiteFiles(path.dirname(outFile('files.txt')));
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
    const site = new SiteSettingsPage(page);
    const setup = async () => {
        await site.goto();
        return site.appearanceSetup();
    };
    const choose = async (box, file) => ({upload: await box.choose(file).catch((e) => `error: ${String(e.message).split('\n')[0]}`)});
    const save = async (form) => {
        const r = await form.pressSave();
        const saved = await form.savedStatus.waitFor({state: 'visible', timeout: 5000}).then(() => true, () => false);
        await L.sleep(500);
        return {saveStatus: r.status(), saved};
    };
    const home = async () => {
        await page.goto(app.url('/index.php/index'));
        await idle(page);
        const links = await page.locator('link[rel="stylesheet"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
        return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), styleSheetLinks: links.filter((h) => /styleSheet/.test(h))};
    };
    const log = serverLog(app);
    try {
        await step('1 sign in as admin', async () => { await signIn(page, 'admin'); return {url: page.url()}; });
        await step('2 Create Journal u60d', async () => ({
            saveStatus: await createContext(page, app, {name: 'u60d Journal', initials: 'u60d', path: 'u60d', email: 'u60d@mailinator.com'}),
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        }));
        if (MODE === 'steps') {
            await step('3 Site Settings › Appearance › Setup', async () => {
                const form = await setup();
                return {topTabs: await site.topTabs.allInnerTexts(), styleSheetBox: L.tidy(await form.styleSheet.field.innerText())};
            });
            await step('4 Upload File u60d-site.css and u60d-logo.png, Save', async () => {
                const form = await site.appearanceSetup();
                const a = await choose(form.styleSheet, files.css);
                const b = await choose(form.logo('en'), files.png);
                return {css: a, logo: b, ...(await save(form))};
            });
            const stored = await step('5 reload, Appearance › Setup: the stored addresses', async () => L.siteStoredAddresses(await setup()));
            record(name('stored'), await screen(page));
            await step('5b signed in: site home page head', home);
            await step('6 Remove both, Save', async () => {
                const form = await setup();
                const from = log.mark();
                const a = await L.pressRemove(form.styleSheet);
                const b = await L.pressRemove(form.logo('en'));
                const s = await save(form);
                await L.sleep(500);
                return {css: a, logo: b, ...s, serverLog: log.since(from)};
            });
            await step('6b reload, Appearance › Setup: what the boxes show', async () => {
                const form = await setup();
                return {styleSheetBox: L.tidy(await form.styleSheet.field.innerText()), stored: await L.siteStoredAddresses(form)};
            });
            record(name('after-remove'), await screen(page));
            await step('7 sign out, site home page head', async () => { await signOut(page); return home(); });
            await step('8 open the style sheet address', async () => L.openAddress(page, stored && stored.styleSheet && stored.styleSheet.href));
            record(name('stylesheet-address'), await screen(page));
            await shot(page, name('stylesheet-address'));
            await step('8 open the logo address (control)', async () => L.openAddress(page, stored && stored.logo && stored.logo.src));
        } else if (MODE === 'nb') {
            await step('nb Appearance › Setup, Upload File u60d-site.css, Save', async () => {
                const form = await setup();
                return {css: await choose(form.styleSheet, files.css), ...(await save(form))};
            });
            const stored = await step('nb reload, Save untouched', async () => {
                const form = await setup();
                const s = await L.siteStoredAddresses(form);
                return {...s, ...(await save(form))};
            });
            const href = stored && stored.styleSheet && stored.styleSheet.href;
            await step('nb signed out: site home page head and the address', async () => {
                await signOut(page);
                return {home: await home(), address: await L.openAddress(page, href)};
            });
            await step('nb sign in, Remove and Upload File u60d-site-2.css, Save', async () => {
                await signIn(page, 'admin');
                const form = await setup();
                const from = log.mark();
                const r = await L.pressRemove(form.styleSheet);
                const a = await choose(form.styleSheet, files.css2);
                const s = await save(form);
                return {remove: r, css: a, ...s, serverLog: log.since(from)};
            });
            await step('nb reload: the stored addresses', async () => L.siteStoredAddresses(await setup()));
            await step('nb signed out after the replacement: site home page head and the address', async () => {
                await signOut(page);
                return {home: await home(), address: await L.openAddress(page, href)};
            });
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
