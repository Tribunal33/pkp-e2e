// Issue report docs/issues/U16-A1-empty-category-no-message.md (U16 A1): a category with nothing in it
// never says so. Takes the report's Steps on PKP's default test dataset (a dataset fleet), OJS, OMP, OPS:
//   1    signed out, the category "Anthropology" by its address (every dataset category is empty):
//        the count line, the heading over the list, the message or its absence, the paging line
// WALK=neighbour runs alone (fix in and out): the same page once it holds one item must list it and
// show no message. It places the published item in "Anthropology" through the screens, as the
// steps of docs/issues/U16-A19-one-item-reads-1-items.md do (dbarnes: unpublish, "Categories",
// publish again), then reads the page signed out, and the page past its last one.
//
// Reset first:  npm run fleet-prep -- --feature issues-c1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-c1 PROBE_AGENT=c1 node bin/probe.js all shared/playwright/checks/issues/empty-category-no-message/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-c1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-c1-3_5 PROBE_AGENT=c1 node bin/probe.js all shared/playwright/checks/issues/empty-category-no-message/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, serverLog, rawKeys} = require('../../../probe');
const L = require('../one-item-reads-1-items/lib.js');

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
            await step('1 the category "Anthropology", signed out', async () => ({
                ...(await L.visit(page, app, L.categoryPath(app, CAT.path))),
                rawKeys: await rawKeys(page).catch(() => []),
            }));
            record('empty-s1-category', await screen(page));
        } else if (MODE === 'neighbour') {
            const sid = L.ITEM[app.name];
            await step('n1 sign in as dbarnes', () => signIn(page, 'dbarnes'));
            await step(`n2 open submission ${sid}`, () => L.openWorkflow(page, app, sid));
            await step('n3 unpublish', async () => ({status: await L.unpublish(page)}));
            await step('n4 the page holding "Categories"', () => L.editableCategories(page, app, sid));
            await step('n5 Categories: Anthropology, Save', () => L.placeInCategory(page, CAT));
            await step('n6 publish again', () => L.publish(page));
            await step('n7 log out', () => signOut(page));
            await step('n8 the category "Anthropology"', () => L.visit(page, app, L.categoryPath(app, CAT.path)));
            record('empty-n8-one-item', await screen(page));
            await step('n9 its page 2, past the last one', () => L.visit(page, app, `${L.categoryPath(app, CAT.path)}?categoryPage=2`));
            record('empty-n9-past-last', await screen(page));
        }
    } finally {
        fact('server log since start', log.since(from));
        record(`empty-facts-${MODE}`, facts);
        await close();
    }
});
