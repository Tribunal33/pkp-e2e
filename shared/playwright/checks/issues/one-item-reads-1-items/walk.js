// Issue report docs/issues/U16-A19-one-item-reads-1-items.md (U16 A19, U68 A1): a category, series or
// catalog page holding one item reads "1 Items" ("1 Titles" on a press). Takes the report's Steps on
// PKP's default test dataset (a dataset fleet), OJS, OMP and OPS:
//   1    OMP only: signed out, the series "Psychology" (its one book, "From Bricks to Brains")
//   2    sign in as dbarnes
//   3    open the published item (OJS 17, OMP 5, OPS 2) from the dashboard
//   4    "Unpublish" ("Unpost"), confirmed
//   5    "Publication Settings" ("Catalog Entry", "Preprint entry")
//   6    "Categories": type "Anthr", choose "Social Sciences > Anthropology"; "Save"
//   7    "Publish" ("Post"), "Confirm" in "Review Publishing Details", confirmed
//   8    log out; the category "Anthropology": its count line
// WALK=neighbour runs alone (fix in and out), signed out, creating nothing: the empty category
// "Sociology" ("0 Items") and OMP's catalog ("2 Titles"): the counts other than one keep their wording.
//
// Reset first:  npm run fleet-prep -- --feature issues-c1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-c1 PROBE_AGENT=c1 node bin/probe.js all shared/playwright/checks/issues/one-item-reads-1-items/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-c1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-c1-3_5 PROBE_AGENT=c1 node bin/probe.js all shared/playwright/checks/issues/one-item-reads-1-items/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, serverLog} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.WALK || 'walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const CAT = L.stepCategory(app);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page).catch(() => null);
    };
    try {
        if (MODE === 'walk') {
            if (app.name === 'omp') {
                await step('1 the series "Psychology", signed out', () => L.visit(page, app, `/index.php/${L.CTX}/catalog/series/psy`));
                record('one-s1-series', await screen(page));
            }
            const sid = L.ITEM[app.name];
            await step('2 sign in as dbarnes', () => signIn(page, 'dbarnes'));
            await step(`3 open submission ${sid}`, async () => {
                await L.openWorkflow(page, app, sid);
                return {url: L.rel(page.url()), controls: L.flat(await page.locator('[data-cy="workflow-controls-right"]').innerText().catch(() => null), 200)};
            });
            await step('4 unpublish', async () => ({status: await L.unpublish(page)}));
            await step('5 the page holding "Categories"', () => L.editableCategories(page, app, sid));
            await step('6 Categories: Anthropology, Save', () => L.placeInCategory(page, CAT));
            record('one-s6-categories', await screen(page));
            await step('7 publish again', () => L.publish(page));
            await step('8a log out', () => signOut(page));
            await step('8b the category "Anthropology"', () => L.visit(page, app, L.categoryPath(app, CAT.path)));
            record('one-s8-category', await screen(page));
        } else if (MODE === 'neighbour') {
            await step('n1 the empty category "Sociology"', () => L.visit(page, app, L.categoryPath(app, 'sociology')));
            record('one-n1-empty', await screen(page));
            if (app.name === 'omp') {
                await step('n2 the catalog', () => L.visit(page, app, `/index.php/${L.CTX}/catalog`));
                record('one-n2-catalog', await screen(page));
            }
        }
    } finally {
        fact('server log since start', log.since(from));
        record(`one-facts-${MODE}`, facts);
        await close();
    }
});
