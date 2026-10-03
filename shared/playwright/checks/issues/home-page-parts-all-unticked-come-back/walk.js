// Issue report for U10 OJS5: a journal manager unticks every "Journal Content Organization" box under Settings ›
// Website › "Appearance" › "Theme" and presses "Save"; "Saved" shows, but the tab reopens with the journal's default
// ticked and the home page keeps showing that part. Takes the report's Steps on PKP's default test dataset (a dataset
// fleet), as `rvaca`, OJS only (the group is OJS's):
//   WALK=steps (default)  "Theme" read (step 2); every box unticked, "Save" (steps 3-4); the tab reopened (step 5);
//                         the home page read (step 6).
//   WALK=nb               the neighbour (fix in and out): "Include recent most published articles" ticked alone,
//                         "Save"; the tab reopened; the home page read.
// Each step records what it saw and never throws on a state the fix changes. The stored theme option is read from the
// database after each save, as evidence only.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u10j --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u10j PROBE_AGENT=u10j node bin/probe.js ojs shared/playwright/checks/issues/home-page-parts-all-unticked-come-back/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u10j-3_5 PROBE_AGENT=u10j node bin/probe.js ojs shared/playwright/checks/issues/home-page-parts-all-unticked-come-back/walk.js
const {forEachApp, launch, signIn, screen, record, shot, idle, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const name = (s) => `ojs5-${MODE}-${s}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
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
    const log = serverLog(app);
    try {
        await step('1 sign in as rvaca', async () => { await signIn(page, 'rvaca'); return {url: page.url()}; });
        const first = await step('2 Appearance › Theme: the boxes', async () => ({...(await L.readTab(page, app)), stored: await L.storedOption(app)}));
        record(name('theme-before'), await screen(page));
        if (!first || !first.groupPresent) {
            fact('no "Journal Content Organization" group on this line', true);
            return;
        }
        const on = MODE === 'nb' ? ['Include recent most published articles'] : [];
        await step(`3-4 tick ${on.length ? on.join(', ') : 'none'}, Save`, async () => {
            const from = log.mark();
            const out = await L.chooseAndSave(page, app, on);
            return {...out, serverLog: log.since(from), stored: await L.storedOption(app)};
        });
        record(name('theme-saved'), await screen(page));
        await step('5 reload, Appearance › Theme: the boxes', async () => L.readTab(page, app));
        record(name('theme-reopened'), await screen(page));
        await shot(page, name('theme-reopened'));
        await step('6 the home page', async () => L.homePage(page, app));
        record(name('home'), await screen(page));
        await shot(page, name('home'));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
