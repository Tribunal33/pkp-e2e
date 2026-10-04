// Issue report on U60 A8: signing in on the site's Login page while the site has a target journal
// (its only journal, or the "Journal redirect") lands every account on the journal's home page, where
// `LoginHandler::_redirectAfterLogin()` means to send role holders to the journal's Dashboard. Takes
// the report's Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets").
// The kit builds nothing: the second journal is made through the screens.
//
// Default mode, the Steps (OJS, OMP, OPS):
//   1-2  signed out, the site's Login page (`index/en/login`), sign in as admin
//   3    control: the journal's own Login page, admin
//   4    admin: Hosted Journals › "Create Journal" "u60f Second Journal" (path `u60fsecond`)
//   5    Site Settings › Settings: "Site Name" "u60f Site" (the dataset has none, and the form
//        requires one), the redirect set to the dataset's context, "Save"
//   6    the site's Login page, admin      7  the same, dbarnes
//   8    control: the journal's own Login page, dbarnes
// `neighbour` as the argument (the fix in and out; runs alone, on a fresh dataset): the second journal
//   with the redirect blank, then the site's Login page as admin (no target: the site's home page);
//   the journal's own Login page as admin, dbarnes, an author and (OJS, OMP) a reviewer (each lands
//   where it did before the fix); then the redirect set and the site's Login page as the author and
//   the reviewer (the fix sends them to their Dashboard page too).
// Each step records what it finds, never throwing.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u60f --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u60f PROBE_AGENT=u60f node bin/probe.js all shared/playwright/checks/issues/site-login-lands-on-journal-home/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u60f-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u60f-3_5 PROBE_AGENT=u60f node bin/probe.js all shared/playwright/checks/issues/site-login-lands-on-journal-home/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/site-login-lands-on-journal-home/fix.diff ojs omp ops
// Facts: .reports/<feature>/u60f/a8-facts-<mode>-<app>.json (PROBE_RUN adds its tag)
const {forEachApp, launch, signIn, signOut, screen, record, serverLog} = require('../../../probe');
const {createContext} = require('../all-dates-error-nothing-published/lib');
const {flat, signInOn, setRedirect} = require('./lib');

const MODE = process.argv.slice(2).includes('neighbour') ? 'neighbour' : 'steps';
const AUTHOR = {ojs: 'amwandenga', omp: 'aclark', ops: 'ccorino'};
const REVIEWER = {ojs: 'jjanssen', omp: 'jjanssen', ops: null};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[a8] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const log = serverLog(app);
    const mark = log.mark();
    const {page, close} = await launch(app);
    const datasetName = (app.contexts && app.contexts[0] && app.contexts[0].name) || null;

    // Sign out, sign in on a Login page, record the landing and its screen.
    const at = async (key, where, username) => {
        await signOut(page).catch(() => {});
        const r = await signInOn(page, app, where, username);
        fact(key, r);
        record(`a8-${MODE}-${key.replace(/\W+/g, '-')}`, await screen(page).catch((e) => ({error: e.message})));
        return r;
    };
    const secondJournal = async (key) => {
        await signOut(page).catch(() => {});
        await signIn(page, 'admin');
        const status = await createContext(page, app, {name: 'u60f Second Journal', initials: 'U60F', path: 'u60fsecond', email: 'u60f@mailinator.com'})
            .catch((e) => `error: ${flat(e.message, 300)}`);
        fact(key, {created: status});
    };
    // The dataset's context as the redirect list names it (the other entry is u60f's).
    const redirectTo = async (key, which) => {
        let label = '';
        if (which === 'dataset') {
            const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
            const site = new SiteSettingsPage(page);
            await site.gotoFromAdministration().catch(() => {});
            const choices = await (await site.settings()).redirectChoices().catch(() => []);
            label = choices.find((c) => c && !/u60f/.test(c)) || datasetName;
        }
        fact(key, await setRedirect(page, label, {siteName: 'u60f Site'}));
    };

    try {
        if (MODE === 'steps') {
            await at('2 site Login page, admin (one journal)', 'index', 'admin');
            await at('3 control: journal Login page, admin', app.contextPath, 'admin');
            await secondJournal('4 second journal');
            await redirectTo('5 redirect set', 'dataset');
            await at('6 site Login page, admin (redirect)', 'index', 'admin');
            await at('7 site Login page, dbarnes (redirect)', 'index', 'dbarnes');
            await at('8 control: journal Login page, dbarnes', app.contextPath, 'dbarnes');
        } else {
            await secondJournal('nb1 second journal');
            await redirectTo('nb2 redirect blank', 'blank');
            await at('nb3 site Login page, admin (two journals, no redirect)', 'index', 'admin');
            await at('nb4 journal Login page, admin', app.contextPath, 'admin');
            await at('nb5 journal Login page, dbarnes', app.contextPath, 'dbarnes');
            await at(`nb6 journal Login page, ${AUTHOR[app.name]}`, app.contextPath, AUTHOR[app.name]);
            if (REVIEWER[app.name]) await at(`nb7 journal Login page, ${REVIEWER[app.name]}`, app.contextPath, REVIEWER[app.name]);
            await signOut(page).catch(() => {});
            await signIn(page, 'admin');
            await redirectTo('nb8 redirect set', 'dataset');
            await at(`nb9 site Login page, ${AUTHOR[app.name]} (redirect)`, 'index', AUTHOR[app.name]);
            if (REVIEWER[app.name]) await at(`nb10 site Login page, ${REVIEWER[app.name]} (redirect)`, 'index', REVIEWER[app.name]);
        }
    } finally {
        facts.serverLog = log.since(mark).map((l) => flat(l, 300));
        facts.landings = Object.fromEntries(Object.entries(facts.steps).filter(([, v]) => v && v.landed !== undefined).map(([k, v]) => [k, v.landed]));
        console.log(`[a8] ${app.name} landings: ${JSON.stringify(facts.landings)}`);
        console.log(`[a8] ${app.name} server log: ${JSON.stringify(facts.serverLog)}`);
        record(`a8-facts-${MODE}`, facts);
        await close();
    }
});
