// Issue report on U60 A12: Site Settings' "Journal redirect" list shows a journal named with an "&"
// or an apostrophe with web codes (`&amp;`, `&#039;`). Takes the report's Steps on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing: the second
// journal is made through the screens.
//
// Default mode, the Steps (OJS, OMP, OPS), as `admin`:
//   2  Hosted Journals › "Create Journal": "u60h Arts & Women's Studies" (u60harts)
//   3  Hosted Journals: the rows' names
//   4  Site Settings › "Site Setup" › "Settings": the "Journal redirect" list   5  "Bulk Emails"
// `neighbour` as the argument (the fix in and out; runs alone, on a fresh dataset): the same journal;
//   the dataset journal's French Distribution › "Paiements" lists (currency, payment method; OJS and
//   OMP: the fix's other select lists); "Bulk Emails" (an HTML label the fix leaves escaped); the
//   redirect chosen, saved and read after a reload; the server log.
// Each step records what it finds, never throwing.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u60h --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-u60h PROBE_AGENT=u60h node bin/probe.js all shared/playwright/checks/issues/site-redirect-list-name-html-codes/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u60h-3_5 --dataset 8 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u60h-3_5 PROBE_AGENT=u60h node bin/probe.js all shared/playwright/checks/issues/site-redirect-list-name-html-codes/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/site-redirect-list-name-html-codes/fix.diff ojs omp ops
// Facts: .reports/<feature>/u60h/a12-facts-<mode>-<app>.json (PROBE_RUN adds its tag)
const {forEachApp, launch, signIn, screen, shot, record, serverLog} = require('../../../probe');
const {createContext} = require('../all-dates-error-nothing-published/lib');
const L = require('./lib');

const MODE = process.argv.slice(2).includes('neighbour') ? 'neighbour' : 'steps';
const NAME = "u60h Arts & Women's Studies";

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[a12] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 900)}`);
    };
    const snap = async (page, name) => {
        record(`a12-${MODE}-${name}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `a12-${MODE}-${name}`).catch(() => {});
    };
    const log = serverLog(app);
    const mark = log.mark();
    const {page, close} = await launch(app);
    const make = async (key) => {
        const status = await createContext(page, app, {
            name: NAME, initials: 'U60HA', path: 'u60harts', email: 'u60ha@mailinator.com',
        }).catch((e) => `error: ${L.flat(e.message)}`);
        fact(key, {created: NAME, status, landed: page.url().replace(/^https?:\/\/[^/]+/, '')});
    };

    try {
        await signIn(page, 'admin');
        if (MODE === 'steps') {
            await make('2 create');
            fact('3 hosted', await L.readHosted(page, app));
            const s = await L.readSiteSettings(page);
            fact('4-5 site settings', s);
            await snap(page, 'step5');
            // Back on "Settings" for the list's picture.
            const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
            await new SiteSettingsPage(page).settings().catch(() => {});
            await snap(page, 'step4');
        } else {
            await make('nb1 create');
            fact('nb2 payments (French)', await L.readPaymentsFrench(page, app));
            await snap(page, 'nb2');
            fact('nb3 site settings', await L.readSiteSettings(page));
            fact('nb4 redirect chosen, saved, reloaded', await L.chooseRedirect(page, 'u60h Arts'));
            await snap(page, 'nb4');
        }
    } finally {
        facts.serverLog = log.since(mark).map((l) => L.flat(l, 300));
        console.log(`[a12] ${app.name} server log: ${JSON.stringify(facts.serverLog)}`);
        record(`a12-facts-${MODE}`, facts);
        await close();
    }
});
