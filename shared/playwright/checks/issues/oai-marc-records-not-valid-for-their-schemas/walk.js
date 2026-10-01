// Issue report docs/issues/U19-A12-oai-marc-records-not-valid-for-their-schemas.md (U19 A12):
// the report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), journal `publicknowledge`, signed out: the OAI-PMH address is
// public, and a browser's address bar sends what a harvester sends. OJS only: a press and a
// preprint server have no MARC formats.
//
// The kit builds nothing and the walk changes nothing.
//   1. GetRecord of article 17 in marcxml
//   2-3. the <record> element checked against MARC21slim.xsd (the schema it names)
//   4. GetRecord of article 17 in oai_marc
//   5. the <oai_marc> element checked against oai_marc.xsd
//   and each record's fields read as a MARC reader takes them (by element name, field number
//   and subfield code): which of 022, 100, 260, 773 it finds.
// The check is libxml2's, through PHP (validate.php), which is what `xmllint --schema` runs.
// Neighbour (in the same walk, with the fix in and out): article 1 (three contributors, so
//   720 in place of 100) in both formats; every field's values, read whatever the markup's
//   spelling, are printed so the two runs can be compared; the oai_dc record of article 17.
//
// Reset first:  npm run fleet-prep -- --feature issues-a12 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-a12 PROBE_AGENT=a12 node bin/probe.js ojs shared/playwright/checks/issues/oai-marc-records-not-valid-for-their-schemas/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a12-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a12-3_5 PROBE_AGENT=a12 node bin/probe.js ojs shared/playwright/checks/issues/oai-marc-records-not-valid-for-their-schemas/walk.js
// Facts: .reports/<feature>/a12/schema-facts[-<run>]-ojs.json (PROBE_NAME=<name> renames it,
//   for the run with the fix in)
const {forEachApp, launch, record} = require('../../../probe');
const {readOai} = require('../../../pages/OaiPages.js');
const {flat, schemaFile, getRecord, check, strict, loose} = require('./lib');

const TAGS = ['008', '022', '024', '100', '720', '260', '773'];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const facts = {line: app.line, dataset: app.dataset, records: []};
    const say = (name, text) => console.log(`[fact] ${app.name} ${name.padEnd(28)} ${text}`);
    try {
        const list = await readOai(app.baseURL, ctx, 'verb=ListIdentifiers&metadataPrefix=marcxml');
        const ids = list.headers.map((h) => h.identifier);
        say('identifiers', JSON.stringify(ids));
        const id17 = ids.find((i) => /article\/17$/.test(i));
        const id1 = ids.find((i) => /article\/1$/.test(i));
        for (const [identifier, role] of [[id17, 'steps'], [id1, 'neighbour']]) {
            for (const prefix of ['marcxml', 'oai_marc']) {
                const name = `${role} ${prefix} ${identifier.replace(/^.*:/, '')}`;
                const r = await getRecord(page, app, ctx, prefix, identifier, `${role}-${prefix}`);
                const c = check(r.xml, prefix, await schemaFile(prefix));
                facts.records.push({role, prefix, identifier, address: r.address, status: r.status, pageStatus: r.pageStatus, error: r.error, valid: c.valid, errors: c.errors, strictFields: c.fields, looseFields: r.fields, xml: r.xml, shown: flat(r.shown, 3000)});
                say(name, `${r.status}/${r.pageStatus} ${c.valid ? 'validates' : `fails to validate, ${c.errors.length} errors`}`);
                for (const e of c.errors) say(`  ${prefix}`, e);
                for (const tag of TAGS) {
                    const s = strict(c.fields, tag);
                    const l = loose(r.fields, tag);
                    if (s.length || l.length) say(`  ${prefix} ${tag}`, `reader finds ${JSON.stringify(s)}; written ${JSON.stringify(l)}`);
                }
                say(`  ${prefix} all values`, JSON.stringify(r.fields.map((f) => `${f.tag}:${f.subfields.map((x) => `${x.code}=${flat(x.value, 60)}`).join('|')}`)));
            }
        }
        const dc = await readOai(app.baseURL, ctx, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id17}`);
        facts.dc = {status: dc.status, metadata: dc.records[0] && dc.records[0].metadata};
        say('neighbour oai_dc', `${dc.status} ${flat(facts.dc.metadata, 20000).length} characters, ${require('crypto').createHash('md5').update(String(facts.dc.metadata).replace(/\s+/g, ' ')).digest('hex')}`);
    } finally {
        record(process.env.PROBE_NAME || 'schema-facts', facts);
        await close();
    }
});
