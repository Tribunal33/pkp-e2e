// Issue report walk: docs/issues/U19-A12-oai-marc-records-fail-schema.md (spec
// U19 register A12). Takes the report's Steps on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), OJS only (OMP and OPS offer no
// MARC format):
//   1-4  dbarnes: Settings › Distribution › "DOIs" › "DOI Prefix" 10.1234, Save;
//        the DOIs page: tick article 17, "Bulk Actions" › "Assign DOIs", confirm
//        (the dataset has no DOI, and field 024 needs one)
//   5-7  signed out: GetRecord of articles 17 and 1 in marcxml and oai_marc,
//        each record validated against the schema it names (marc.js)
// The kit builds nothing; the steps change the dataset, so reset the fleet
// before each walk.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w14 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w14 PROBE_AGENT=w14 node bin/probe.js ojs shared/playwright/checks/issues/oai-marc-records-fail-schema/walk.js
// Run (3.5):    both with PKP_E2E_LINE=stable-3_5_0 in front (feature issues-w14-3_5; PROBE_RUN=r35 on the walk)
// Facts: .reports/<feature>/w14/walk[-<run>]-ojs.json, the records as <name>.xml beside it
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {readMarc} = require('./marc');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name !== 'ojs') {
        console.log(`${app.name}: no MARC metadata format; skipped`);
        return;
    }
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    try {
        // Steps 1-4: dbarnes gives article 17 a DOI.
        const {DoiSettings, DoisPage} = require('../../../pages/DoisPages.js');
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            const settings = new DoiSettings(page, app.contextPath);
            await settings.goto('Setup');
            await settings.prefixBox().fill('10.1234');
            const saved = await settings.pressSave(settings.setup);
            facts.prefixSave = saved.status();
            await idle(page);
            record(`01-doi-setup-saved`, await screen(page));
            const dois = new DoisPage(page, app.contextPath);
            await dois.goto();
            await dois.search('Antimicrobial');
            facts.rowsFound = await dois.rowNames();
            const assigned = await dois.runBulk('Assign DOIs', [17]);
            facts.assign = assigned.status();
            await idle(page);
            const s = await screen(page);
            record(`02-dois-assigned`, s);
            facts.row17 = (await dois.row(17).innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 300);
            await signOut(page);
        } finally {
            await close();
        }
        // Steps 5-8: signed out, each record validated against its schema (step 6, the dataField -> datafield edit, is done on the saved copy).
        const {page: visitor, close: closeVisitor} = await launch(app);
        try {
            for (const id of [17, 1]) {
                for (const prefix of ['marcxml', 'oai_marc']) {
                    const r = await readMarc(visitor, app, prefix, `oai:ojs2.localhost:article/${id}`, `article${id}-${prefix}${run}`);
                    facts[`article${id}-${prefix}`] = r;
                }
                // The browser view of one record, as a person opens it.
                await visitor.goto(app.url(`/index.php/${app.contextPath}/oai?verb=GetRecord&metadataPrefix=marcxml&identifier=oai:ojs2.localhost:article/${id}`));
                await idle(visitor);
                record(`03-article${id}-marcxml-view`, await screen(visitor));
            }
        } finally {
            await closeVisitor();
        }
        facts.summary = Object.fromEntries(Object.entries(facts).filter(([k]) => k.startsWith('article')).map(([k, v]) => [k, v.error || {valid: v.valid, errors: v.errors, errorsAfterDataField: v.errorsAfterDataField}]));
        facts.summary.doi = {prefixSave: facts.prefixSave, assign: facts.assign, row17: facts.row17};
        console.log(app.name, JSON.stringify(facts.summary, null, 1));
    } finally {
        record('walk', facts);
    }
});
