// Issue report for U60 OMP1: a "Site style sheet" uploaded under Administration › Site Settings › "Appearance" ›
// "Setup" is saved, but no page of a press site loads it (the site's own pages and every press's), while a journal
// site and a preprint server load it on every public page. Takes the report's Steps on PKP's default test dataset
// (a dataset fleet), as `admin`. The dataset holds one context, so the "Appearance" tab needs a second one: step 2
// creates it through Administration's "Create Press" (Journal, Server).
//   WALK=steps (default)  2 "Create Press" u60i; 3 Site Settings › Appearance › Setup; 4 "Upload File" u60i-site.css
//                         under "Site style sheet", "Save"; 5 reloaded, the stored file read; 6–8 signed out, the
//                         site's, publicknowledge's and u60i's home pages: their style sheet links and whether the
//                         sheet's bar shows; the sheet's own address opened.
//   WALK=nb               the neighbour (fix in and out): 2 as above; the site sheet uploaded and saved as in 4;
//                         publicknowledge's Settings › Website › Appearance › "Advanced": "Upload File"
//                         u60i-press.css under the press's style sheet, "Save"; signed in, Site Settings: the
//                         editorial screen loads neither sheet; signed out, the three home pages: which sheets load,
//                         in which order, and whose bar wins on publicknowledge (the press's own must).
// Each step records what it saw and never throws on a state the fix changes.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u60i --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-u60i PROBE_AGENT=u60i node bin/probe.js all shared/playwright/checks/issues/press-ignores-site-style-sheet/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u60i-3_5 PROBE_AGENT=u60i node bin/probe.js all shared/playwright/checks/issues/press-ignores-site-style-sheet/walk.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, outFile, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const name = (s) => `omp1-${MODE}-${s}`;
    const files = L.makeFiles(path.dirname(outFile('files.txt')));
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e.message).split('\n')[0]));
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '')}); });
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
    const log = serverLog(app);
    const uploadSiteSheet = async () => {
        const form = await setup();
        const upload = await form.styleSheet.choose(files.site).then(() => 'chosen', (e) => `error: ${String(e.message).split('\n')[0]}`);
        const r = await form.pressSave();
        const saved = await form.savedStatus.waitFor({state: 'visible', timeout: 5000}).then(() => true, () => false);
        await L.sleep(500);
        return {upload, saveStatus: r.status(), saved};
    };
    try {
        await step('1 sign in as admin', async () => { await signIn(page, 'admin'); return {url: page.url()}; });
        await step('2 Create Press u60i', async () => ({
            saveStatus: await L.createContext(page, app, {name: 'u60i Press', initials: 'u60i', path: 'u60i', email: 'u60i@mailinator.com'}),
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        }));
        if (MODE === 'steps') {
            await step('3 Site Settings › Appearance › Setup', async () => {
                const form = await setup();
                return {topTabs: await site.topTabs.allInnerTexts(), styleSheetBox: L.tidy(await form.styleSheet.field.innerText())};
            });
            await step('4 Upload File u60i-site.css, Save', async () => {
                const from = log.mark();
                return {...(await uploadSiteSheet()), serverLog: log.since(from)};
            });
            const stored = await step('5 reload, Appearance › Setup: the stored file', async () => {
                const form = await setup();
                const link = form.styleSheet.fileLink.first();
                return (await link.count()) ? {text: (await link.innerText()).trim(), href: await link.getAttribute('href')} : {text: null};
            });
            record(name('stored'), await screen(page));
            await signOut(page).catch(() => null);
            for (const [n, label, p] of [['6', 'site', 'index'], ['7', 'publicknowledge', 'publicknowledge'], ['8', 'u60i', 'u60i']]) {
                await step(`${n} signed out: ${label} home page`, async () => L.look(page, app, p));
                record(name(`home-${label}`), await screen(page));
                if (n === '7') await shot(page, name('home-publicknowledge'));
            }
            await step('9 the stored sheet opened at its address', async () => L.openAddress(page, stored && stored.href));
        } else if (MODE === 'nb') {
            await step('nb site sheet: Upload File u60i-site.css, Save', uploadSiteSheet);
            await step('nb publicknowledge Appearance › Advanced: Upload File u60i-press.css, Save', async () => {
                await L.openAppearance(page, app, 'advanced');
                const b = L.box(page, 'appearanceAdvanced', 'styleSheet', null);
                const a = await L.pressUploadFile(page, b, files.press);
                return {css: a, ...(await L.save(page, b))};
            });
            await step('nb signed in: Site Settings (editorial screen) style sheets', async () => {
                await site.goto();
                const all = await site.styleSheets();
                return {userSheets: all.filter((h) => /styleSheet\.css/.test(h)).map((h) => h.replace(/^https?:\/\/[^/]+/, ''))};
            });
            await signOut(page).catch(() => null);
            for (const [label, p] of [['site', 'index'], ['publicknowledge', 'publicknowledge'], ['u60i', 'u60i']]) {
                await step(`nb signed out: ${label} home page`, async () => L.look(page, app, p));
            }
        }
    } finally {
        fact('page script errors', pageErrors);
        fact('server errors (5xx)', failed);
        record(name('facts'), facts);
        await close();
    }
});
