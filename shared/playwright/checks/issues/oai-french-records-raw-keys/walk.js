// Spec U19 A13: a journal's and a press's OAI-PMH records read in French (Canada) carry raw
// translation keys. The walk of two issue reports the entry joined:
//   docs/issues/U13-A1-french-version-name-raw-key.md (the journal: MARC fields 251 and 780)
//   docs/issues/U69-A15-omp-french-book-page-raw-keys.md (the press: Dublin Core "Resource Type")
// Walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"). The OAI
// address is public: every read is signed out, in the browser (what the page shows) and as a
// harvester (the XML as sent). The kit builds nothing and the walk changes nothing.
//
// Journal (OJS):
//   1. …/fr_CA/oai?verb=ListIdentifiers&metadataPrefix=marcxml: the identifier of article 1
//   2. …/fr_CA/oai?verb=GetRecord&metadataPrefix=marcxml&identifier=…: field 251
//   3. the same in oai_marc
//   control and neighbour: the same two records at …/en/oai; the French Dublin Core record's
//      "Resource Type" (texts French already has)
//   Field 780 names the version before, and only an article with two published versions that
//   differ in their first number has one (Repository::getVersionRelation()); the dataset has
//   none, so 780 is not walked.
// Press (OMP):
//   1. …/fr_CA/oai?verb=ListRecords&metadataPrefix=oai_dc: each book's "Resource Type"
//   control and neighbour: the same list at …/en/oai; every other element of the French records
//      (a digest per record, dc:type left out)
//
// Reset first:  npm run fleet-prep -- --feature issues-a13 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-a13 PROBE_AGENT=a13 ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/oai-french-records-raw-keys/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a13-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a13-3_5 PROBE_AGENT=a13 node bin/probe.js all shared/playwright/checks/issues/oai-french-records-raw-keys/walk.js
// Facts: .reports/<feature>/a13/french-facts[-<run>]-<app>.json (PROBE_NAME=<name> renames it)
const crypto = require('crypto');
const {forEachApp, launch, record} = require('../../../probe');
const {readOai} = require('../../../pages/OaiPages.js');
const {getRecord, loose} = require('../oai-marc-records-not-valid-for-their-schemas/lib');
const {readDc, viewDc} = require('../oai-dc-peer-reviewed-type-gone-after-section-save/lib');

const CTX = 'publicknowledge';
const LANGS = ['fr_CA', 'en'];
const md5 = (v) => crypto.createHash('md5').update(JSON.stringify(v)).digest('hex').slice(0, 12);

forEachApp(async (app) => {
    if (app.name === 'ops') return console.log('[walk] ops: no MARC formats and no translated type word; not walked');
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {app: app.name, line: app.line || 'main', reads: []};
    const say = (name, value) => console.log(`[fact] ${app.name} ${String(name).padEnd(34)} ${typeof value === 'string' ? value : JSON.stringify(value)}`);
    const {page, close} = await launch(app);
    try {
        if (app.name === 'ojs') {
            const marc = async (stage) => {
                for (const lang of LANGS) {
                    const ctx = `${CTX}/${lang}`;
                    const list = await readOai(app.baseURL, ctx, 'verb=ListIdentifiers&metadataPrefix=marcxml');
                    const id = list.headers.map((h) => h.identifier).find((i) => /article\/1$/.test(i));
                    for (const prefix of ['marcxml', 'oai_marc']) {
                        const r = await getRecord(page, app, ctx, prefix, id, `${stage}-${lang}-${prefix}`);
                        const rest = r.fields.filter((f) => !['251', '780'].includes(f.tag));
                        const row = {stage, lang, prefix, address: r.address, status: r.status, pageStatus: r.pageStatus, error: r.error,
                            f251: loose(r.fields, '251'), f780: loose(r.fields, '780'), others: `${rest.length} fields, ${md5(rest)}`,
                            keysOnPage: [...new Set(String(r.shown || '').match(/##[^#\s]+##/g) || [])]};
                        facts.reads.push(row);
                        say(`${stage} ${lang} ${prefix}`, `${row.status}/${row.pageStatus} 251 ${JSON.stringify(row.f251)} 780 ${JSON.stringify(row.f780)}; ${row.others}; keys on the page ${JSON.stringify(row.keysOnPage)}`);
                    }
                }
            };
            await marc('steps 1-3');
            for (const lang of LANGS) {
                const dc = await readDc(app, `${CTX}/${lang}`, 'verb=ListRecords&metadataPrefix=oai_dc');
                facts.reads.push({stage: 'neighbour oai_dc', lang, status: dc.status, types: dc.records.map((r) => r.type)});
                say(`neighbour oai_dc ${lang} types`, dc.records.map((r) => `${String(r.identifier).replace(/^.*:/, '')}: ${r.type.join(' ')}`).join(' || '));
            }
        }
        if (app.name === 'omp') {
            for (const lang of LANGS) {
                const ctx = `${CTX}/${lang}`;
                const params = 'verb=ListRecords&metadataPrefix=oai_dc';
                const dc = await readDc(app, ctx, params);
                const whole = await readOai(app.baseURL, ctx, params);
                const view = await viewDc(page, app, ctx, params, `omp-dc-${lang}`);
                const rows = dc.records.map((r, i) => {
                    const meta = whole.records[i] && whole.records[i].metadata;
                    const rest = String(meta || '').replace(/<dc:type[\s\S]*?<\/dc:type>/g, '');
                    return {identifier: String(r.identifier).replace(/^.*:/, ''), deleted: r.deleted, type: r.type, others: md5(rest)};
                });
                facts.reads.push({lang, address: dc.address, status: dc.status, error: dc.error, records: rows, pageStatus: view.status, shownResourceType: view['Resource Type']});
                say(`step 1 ${lang} ${dc.status}/${view.status}`, rows.map((r) => `${r.identifier}: ${r.type.join(' ')} (others ${r.others})`).join(' || '));
                say(`step 2 ${lang} "Resource Type" shown`, view['Resource Type']);
            }
        }
    } finally {
        record(process.env.PROBE_NAME || 'french-facts', facts);
        await close();
    }
});
