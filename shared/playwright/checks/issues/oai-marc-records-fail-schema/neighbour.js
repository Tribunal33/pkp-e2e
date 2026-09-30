// Neighbour check for docs/issues/U19-A12-oai-marc-records-fail-schema.md:
// what the fix must leave alone. Signed out, after walk.js on the same fleet:
// the oai_dc record of article 17 (whole), and the field values (tag,
// indicators read either way, subfield, text) of the marcxml and oai_marc
// records of articles 17 and 1, and ListRecords in both MARC formats (status
// and record count). Run it with the fix in and then out on the same fleet,
// without a reset between (the DOI walk.js assigns has a random suffix), then
// compare the two JSON files: the oai_dc record is identical and the MARC
// fields carry the same values, "#" read as blank; only the markup differs.
// Changes nothing.
//
// Run: PROBE_FEATURE=issues-w14 PROBE_AGENT=w14 PROBE_RUN=<out|in> node bin/probe.js ojs shared/playwright/checks/issues/oai-marc-records-fail-schema/neighbour.js
const {forEachApp, launch, record} = require('../../../probe');
const {readMarc} = require('./marc');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const run = process.env.PROBE_RUN || 'x';
    const {page, close} = await launch(app);
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run}};
    try {
        const dc = await page.request.get(app.url(`/index.php/${app.contextPath}/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/17`));
        facts.oaiDc17 = (await dc.text()).replace(/<responseDate>[^<]*<\/responseDate>/, '');
        for (const id of [17, 1]) {
            for (const prefix of ['marcxml', 'oai_marc']) {
                const r = await readMarc(page, app, prefix, `oai:ojs2.localhost:article/${id}`, `n-article${id}-${prefix}-${run}`);
                facts[`article${id}-${prefix}`] = {valid: r.valid, fields: r.fields};
            }
        }
        for (const prefix of ['marcxml', 'oai_marc']) {
            const lr = await page.request.get(app.url(`/index.php/${app.contextPath}/oai?verb=ListRecords&metadataPrefix=${prefix}`));
            const body = await lr.text();
            facts[`list-${prefix}`] = {status: lr.status(), records: (body.match(/<header>/g) || []).length};
        }
        console.log(app.name, run, JSON.stringify({lists: [facts['list-marcxml'], facts['list-oai_marc']], valid: Object.fromEntries(Object.entries(facts).filter(([k]) => k.startsWith('article')).map(([k, v]) => [k, v.valid]))}));
    } finally {
        record('neighbour', facts);
        await close();
    }
});
