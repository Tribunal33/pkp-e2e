// Issue report walk: spec U11 register A5 (the site's Highlights tab cannot save, order or list).
// Takes the report's Steps through the screens on a dataset fleet (PKP's default test dataset,
// harness.md "Dataset fleets"). The kit builds nothing: the second journal is made on screen
// (Administration › Hosted Journals › "Create Journal"), as the Steps say. Fact labels carry the
// Steps' numbers; every step records what it finds and never throws. Reset the fleet before each
// walk: the walk adds a journal and highlights.
//
// Modes (first argument):
//   (none)      the Steps 1-7 as `admin`, then the control (a highlight added on the journal's own
//               Website settings) and the site's list address typed into the browser.
//   neighbour   what a fix must leave alone (runs alone, on a fresh dataset): `rvaca` (journal
//               manager) adds and orders a highlight on the journal's tab; `rvaca` types the site's
//               settings and highlights addresses (refused); `dbuskins` (section editor) types the
//               journal's highlights address (refused); `admin` types the journal's highlights
//               address (listed) and, on OJS, the sections list at the site's address (spec U17 A10,
//               a separate fault the fix must not hide).
//
// Reset:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u11c --dataset 3 --reset
// Run:    PROBE_FEATURE=issues-u11c PROBE_AGENT=u11c node bin/probe.js all shared/playwright/checks/issues/site-highlights-cannot-be-saved/walk.js [neighbour]
// 3.5:    PKP_E2E_LINE=stable-3_5_0 (reset with --feature issues-u11c-3_5) and PROBE_RUN=r35 PROBE_FEATURE=issues-u11c-3_5 in front.
// Fix:    node bin/try-fix.js apply shared/playwright/checks/issues/site-highlights-cannot-be-saved/fix.diff ojs omp ops
// Facts:  .reports/<feature>/u11c/a5-facts-<mode>-<app>.json (PROBE_RUN adds its tag)
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog} = require('../../../probe');
const {createContext} = require('../all-dates-error-nothing-published/lib');
const L = require('./lib');

const MODE = process.argv.slice(2).includes('neighbour') ? 'neighbour' : 'steps';
const SECOND = {name: 'u11c Second Journal', initials: 'U11C', path: 'u11csecond', email: 'u11csecond@mailinator.com'};
const NAMES = {ojs: 'u11c Second Journal', omp: 'u11c Second Press', ops: 'u11c Second Server'};
const SITE_H = {title: 'u11c Site highlight', url: 'https://example.org/u11c', label: 'Read more'};
const CTX_H = {title: 'u11c Journal highlight', url: 'https://example.org/u11c-journal', label: 'Read more'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[a5] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 900)}`);
    };
    let n = 0;
    const snap = async (page, name) => {
        record(`a5-${MODE}-${String(++n).padStart(2, '0')}-${name}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `a5-${MODE}-${name}`).catch(() => {});
    };
    const log = serverLog(app);
    const mark = log.mark();
    const {page, close} = await launch(app);
    const answers = L.highlightAnswers(page);

    try {
        if (MODE === 'steps') {
            // 1
            await signIn(page, 'admin');
            // 2
            const name = NAMES[app.name];
            const status = await createContext(page, app, {...SECOND, name}).catch((e) => `error: ${L.flat(e.message)}`);
            fact('2 create', {name, path: SECOND.path, status, landed: L.rel(page.url())});
            // 3
            fact('3 site highlights tab', await L.openSiteHighlights(page));
            await snap(page, 'step3-tab');
            // 4
            answers.clear();
            fact('4 add highlight', await L.addHighlight(page, SITE_H));
            fact('4 answers', await answers.list());
            await snap(page, 'step4-after-save');
            // 5
            answers.clear();
            fact('5 reload', await L.openSiteHighlights(page));
            await snap(page, 'step5-reloaded');
            // 6
            answers.clear();
            fact('6 order and save', await L.orderAndSave(page));
            fact('6 answers', await answers.list());
            await snap(page, 'step6-after-save-order');
            // 7
            fact('7 site home page', await L.siteHome(page, app));
            // Control: the journal's own tab.
            fact('c journal highlights tab', await L.openContextHighlights(page, app, app.contextPath));
            answers.clear();
            fact('c add highlight', await L.addHighlight(page, CTX_H));
            fact('c answers', await answers.list());
            await snap(page, 'control-journal');
            // The site's list address typed into the browser (the request the list sends).
            fact('x site list typed', await L.typeAddress(page, app, '/index.php/index/api/v1/highlights'));
        } else {
            await signIn(page, 'rvaca');
            fact('nb1 journal tab', await L.openContextHighlights(page, app, app.contextPath));
            answers.clear();
            fact('nb1 add', await L.addHighlight(page, CTX_H));
            fact('nb1 order', await L.orderAndSave(page));
            fact('nb1 answers', await answers.list());
            await snap(page, 'nb1-journal');
            fact('nb2 site settings typed', await L.typeAddress(page, app, '/index.php/index/en/admin/settings'));
            fact('nb2 site list typed', await L.typeAddress(page, app, '/index.php/index/api/v1/highlights'));
            await signOut(page);
            await signIn(page, 'dbuskins');
            fact('nb3 journal list typed', await L.typeAddress(page, app, `/index.php/${app.contextPath}/api/v1/highlights`));
            await signOut(page);
            await signIn(page, 'admin');
            fact('nb4 journal list typed', await L.typeAddress(page, app, `/index.php/${app.contextPath}/api/v1/highlights`));
            if (app.name === 'ojs') fact('nb5 sections at site typed', await L.typeAddress(page, app, '/index.php/index/api/v1/sections'));
        }
    } catch (e) {
        fact('ERROR', L.flat(e.stack || e, 1200));
        await snap(page, 'ERROR').catch(() => {});
    } finally {
        facts.serverLog = log.since(mark).map((l) => L.flat(l, 400));
        console.log(`[a5] ${app.name} server log: ${JSON.stringify(facts.serverLog)}`);
        record(`a5-facts-${MODE}`, facts);
        await close();
    }
});
