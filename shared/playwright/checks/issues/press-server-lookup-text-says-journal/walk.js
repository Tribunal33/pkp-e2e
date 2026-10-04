// Issue report docs/issues/U42-A4-press-server-lookup-text-says-journal.md (U42 A4): with
// references metadata lookup on, the workflow's "References" page of a press or a preprint server
// reads "Structuring and Metadata Lookup is enabled for this Journal." Takes the report's Steps
// on PKP's default test dataset (lookup is off there):
//   1-2  rvaca, Settings > Workflow > "Metadata": tick "Enable references structuring and
//        metadata lookup", Save
//   3-4  submission OMP 4 / OPS 1 (OJS 5, the control), "Publication" ("Preprint") >
//        "References": the text above the "Add" box
// NB=1 runs the neighbour check alone: steps 3-4 with lookup left off (no lookup text; the
// page's other texts as before), for a fix in and out.
// It changes the dataset (the setting): reset the dataset fleet first.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/press-server-lookup-text-says-journal/walk.js
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {enableLookup, readReferencesPage} = require('./lib');
const {gotoWorkflow, openEntry} = require('../arxiv-id-loses-version/lib');

const SUBMISSION = {ojs: 5, omp: 4, ops: 1};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const facts = {app: app.name, line: app.line || 'main', submission: SUBMISSION[app.name], nb};
    const fact = (k, v) => { facts[k] = v; console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        if (!nb) {
            try { fact('step2-setting', await enableLookup(page, app)); } catch (e) { fact('step2-setting', {threw: e.message.slice(0, 300)}); }
            record('step2-settings', await screen(page));
        }
        await gotoWorkflow(page, app, SUBMISSION[app.name]);
        fact('step3-heading', await openEntry(page, 'References'));
        await page.locator('table[aria-label]:visible').first().waitFor({timeout: 30_000}).catch(() => {});
        await idle(page);
        record(nb ? 'nb-references' : 'step3-references', await screen(page));
        await shot(page, nb ? 'nb-references' : 'step3-references');
        const read = await readReferencesPage(page);
        fact(nb ? 'nb-page' : 'step4-page', read);
        fact(nb ? 'nb-verdict' : 'verdict', {
            lookupTextShown: !!read.lookupText,
            saysThisJournal: /for this Journal/.test(read.lookupText || ''),
        });
    } finally {
        await close();
    }
    record(nb ? 'a4-nb-facts' : 'a4-facts', facts);
});
