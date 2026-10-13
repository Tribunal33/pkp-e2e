// Kept walk of issue report docs/issues/U41-A27-affiliations-space-before-comma.md (U41 A27): on a
// published item, a contributor's second affiliation is added and the item's page is read: the
// affiliations line as shown and as served. On PKP's default test dataset. Helpers in lib.js here.
//
// Modes (argv[2]):
//   steps      (default) the report's Steps 1-5.
//   neighbour  read only: pages whose contributors have one affiliation each (OJS 1, OMP 14,
//              OPS 7): their affiliation lines, contributor roles and keywords.
//
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/affiliations-space-before-comma/walk.js [steps|neighbour]
// (PKP_E2E_LINE=stable-3_5_0 in front for 3.5; PROBE_RUN=<run> keeps one run's records apart.)
// Facts: .reports/<feature>/<id>/a27-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const mode = process.argv[2] === 'nb' ? 'neighbour' : process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = `a27-${mode}${process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : ''}`;
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: app.name === 'ops' ? 'Preprint' : 'Publication'}});
    try {
        if (mode === 'neighbour') {
            fact('neighbour page', await L.readItemPage(page, app, L.NEIGHBOURS[app.name]));
            record(`${run}-screen`, await screen(page));
            return;
        }
        const c = L.CASES[app.name];
        // step 1
        await signIn(page, 'dbarnes');
        // steps 2-3
        const opened = await L.openContributors(page, wf, c.id);
        fact('3 Contributors page', opened);
        if (!opened.addEnabled) {
            fact('stopped', 'the published version cannot be edited here');
            return;
        }
        // step 4
        fact('4 second affiliation', await L.addSecondAffiliation(page, wf, c.contributor));
        // step 5
        fact('5 item page', await L.readItemPage(page, app, c.page));
        record(`${run}-5`, await screen(page));
        await shot(page, `${run}-5`);
    } finally {
        record(run, facts);
        await close();
    }
});
