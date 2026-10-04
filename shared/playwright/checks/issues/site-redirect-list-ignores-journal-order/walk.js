// Issue report on U60 A11: Site Settings' "Journal redirect" list follows neither the journals'
// names nor the Hosted Journals order, and moves after an "Order" or an "Edit" save there. Takes
// the report's Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets").
// The kit builds nothing: the two more journals are made through the screens.
//
// Default mode, the Steps (OJS, OMP, OPS), as `admin`:
//   2-3  Hosted Journals › "Create Journal": "u60g Zulu" (u60gzulu), then "u60g Alpha" (u60galpha)
//   4    Hosted Journals read      5  Site Settings › Settings: the redirect list; Bulk Emails (control)
//   6    "Order": u60g Alpha above u60g Zulu, "Done"     7  the redirect list and Bulk Emails again
//   8    the dataset journal's "Edit" › "Save", nothing changed     9  the redirect list again
// `neighbour` as the argument (the fix in and out; runs alone, on a fresh dataset): Site Settings
//   with the dataset's one journal (no redirect list, the reduced tabs); the two journals; Bulk
//   Emails, Hosted Journals and the site's home page list after an "Order" (each keeps the site's
//   order); the server log.
// Each step records what it finds, never throwing.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u60g --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-u60g PROBE_AGENT=u60g node bin/probe.js all shared/playwright/checks/issues/site-redirect-list-ignores-journal-order/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u60g-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u60g-3_5 PROBE_AGENT=u60g node bin/probe.js all shared/playwright/checks/issues/site-redirect-list-ignores-journal-order/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/site-redirect-list-ignores-journal-order/fix.diff ojs omp ops
// Facts: .reports/<feature>/u60g/a11-facts-<mode>-<app>.json (PROBE_RUN adds its tag)
const {forEachApp, launch, signIn, screen, shot, record, serverLog} = require('../../../probe');
const {createContext} = require('../all-dates-error-nothing-published/lib');
const L = require('./lib');

const MODE = process.argv.slice(2).includes('neighbour') ? 'neighbour' : 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[a11] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 900)}`);
    };
    const snap = async (page, name) => {
        record(`a11-${MODE}-${name}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `a11-${MODE}-${name}`).catch(() => {});
    };
    const log = serverLog(app);
    const mark = log.mark();
    const {page, close} = await launch(app);
    const noun = L.WORDS[app.name].noun;
    const make = async (key, word) => {
        const lower = word.toLowerCase();
        const status = await createContext(page, app, {
            name: `u60g ${word}`, initials: `U60G${word[0]}`, path: `u60g${lower}`, email: `u60g${lower[0]}@mailinator.com`,
        }).catch((e) => `error: ${L.flat(e.message)}`);
        fact(key, {created: `u60g ${word}`, status, landed: page.url().replace(/^https?:\/\/[^/]+/, '')});
    };

    try {
        await signIn(page, 'admin');
        if (MODE === 'steps') {
            await make('2 create u60g Zulu', 'Zulu');
            await make('3 create u60g Alpha', 'Alpha');
            fact('4 hosted', await L.readHosted(page, app));
            fact('5 site settings', await L.readSiteSettings(page));
            await snap(page, 'step5');
            fact('6 order: u60g Alpha above u60g Zulu', await L.orderAbove(page, app, 'u60galpha', 'u60gzulu'));
            fact('6 hosted', await L.readHosted(page, app));
            fact('7 site settings', await L.readSiteSettings(page));
            await snap(page, 'step7');
            fact(`8 edit ${app.contextPath}, save unchanged`, await L.editSave(page, app, app.contextPath));
            fact('8 hosted', await L.readHosted(page, app));
            fact('9 site settings', await L.readSiteSettings(page));
            await snap(page, 'step9');
        } else {
            fact('nb1 site settings, one ' + noun.toLowerCase(), await L.readSiteSettings(page));
            await make('nb2 create u60g Zulu', 'Zulu');
            await make('nb3 create u60g Alpha', 'Alpha');
            fact('nb4 order: u60g Alpha above u60g Zulu', await L.orderAbove(page, app, 'u60galpha', 'u60gzulu'));
            fact('nb5 hosted', await L.readHosted(page, app));
            const s = await L.readSiteSettings(page);
            fact('nb6 site settings', s);
            // The site's home page list (ContextDAO::getAll, untouched by the fix).
            await page.goto(app.url('/index.php/index/index'));
            await page.waitForLoadState('load');
            fact('nb7 site home list', await page.locator('.page_index_site h3 a, .page_index_site h2 a').allInnerTexts().then((a) => a.map((t) => L.flat(t, 80))).catch((e) => ({error: L.flat(e.message)})));
            await snap(page, 'nb7');
        }
    } finally {
        facts.serverLog = log.since(mark).map((l) => L.flat(l, 300));
        console.log(`[a11] ${app.name} server log: ${JSON.stringify(facts.serverLog)}`);
        record(`a11-facts-${MODE}`, facts);
        await close();
    }
});
