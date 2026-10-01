// Issue report docs/issues/U19-A15-oai-marc-008-date-percent-signs.md (U19 A15): the report's
// Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), journal `publicknowledge`, signed out: the OAI-PMH address is public.
// OJS only: a press and a preprint server have no MARC formats.
//
// The kit builds nothing and the walk changes nothing.
//   1-2. GetRecord of article 17 in marcxml: field 008 on the page and as sent
//   3. the same in oai_marc
//   control: the "Date" of the same record in oai_dc
// Neighbour (in the same walk, with the fix in and out): article 1's 008 in both formats;
//   every other field of the four records (printed as one digest per record, 008 left out);
//   the 260 "c" issue date, which no date pattern writes.
//
// With a time zone as the script's argument (`… walk.js Europe/Prague`) the same steps run on a
//   second server of the same install whose config differs only in `time_zone` (lib.js
//   startZoneServer): an install east of UTC, where the record's day is the one before the
//   publication date as long as the template sends the date through `strtotime`.
//
// Reset first:  npm run fleet-prep -- --feature issues-a12 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-a12 PROBE_AGENT=a12 node bin/probe.js ojs shared/playwright/checks/issues/oai-marc-008-date-percent-signs/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a12-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a12-3_5 PROBE_AGENT=a12 node bin/probe.js ojs shared/playwright/checks/issues/oai-marc-008-date-percent-signs/walk.js
// Facts: .reports/<feature>/a12/f008-facts[-<run>]-ojs.json (PROBE_NAME=<name> renames it)
// The identifier is the one ListIdentifiers gives for article 17 (its middle part is the
// install's `[oai] repository_id`).
const crypto = require('crypto');
const {forEachApp, launch, record} = require('../../../probe');
const {readOai, parseDc} = require('../../../pages/OaiPages.js');
const {getRecord, loose, startZoneServer} = require('../oai-marc-records-not-valid-for-their-schemas/lib');

const ZONE = process.argv.find((a) => /^[A-Z][A-Za-z_]+\/[A-Za-z_]+$/.test(a));

forEachApp(async (fleetApp) => {
    if (fleetApp.name !== 'ojs') return;
    const zone = ZONE ? await startZoneServer(fleetApp, ZONE) : null;
    const app = zone ? zone.app : fleetApp;
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const facts = {line: app.line, dataset: app.dataset, zone: ZONE || 'the fleet\'s (UTC)', records: []};
    const say = (name, text) => console.log(`[fact] ${app.name} ${name.padEnd(28)} ${text}`);
    try {
        say('time zone', facts.zone);
        const list = await readOai(app.baseURL, ctx, 'verb=ListIdentifiers&metadataPrefix=marcxml');
        const ids = list.headers.map((h) => h.identifier);
        const id17 = ids.find((i) => /article\/17$/.test(i));
        const id1 = ids.find((i) => /article\/1$/.test(i));
        for (const [identifier, role] of [[id17, 'steps'], [id1, 'neighbour']]) {
            for (const prefix of ['marcxml', 'oai_marc']) {
                const r = await getRecord(page, app, ctx, prefix, identifier, `f008-${role}-${prefix}`);
                const f008 = r.fields.filter((f) => f.tag === '008').map((f) => f.subfields[0].value);
                const onPage = (String(r.shown).replace(/\s+/g, " ").match(/<(?:controlfield tag|fixfield id)="008"\s*>[^<]*<\/\w+>/) || [null])[0];
                const rest = r.fields.filter((f) => f.tag !== '008');
                const digest = crypto.createHash('md5').update(JSON.stringify(rest)).digest('hex');
                facts.records.push({role, prefix, identifier, address: r.address, status: r.status, pageStatus: r.pageStatus, f008, onPage, rest, digest});
                const name = `${role} ${prefix} ${identifier.replace(/^.*:/, '')}`;
                say(name, `${r.status}/${r.pageStatus} 008 as sent ${JSON.stringify(f008)} (${f008[0] ? f008[0].length : 0} characters)`);
                say(`  on the page`, JSON.stringify(onPage));
                say(`  260`, JSON.stringify(loose(r.fields, '260')));
                say(`  other fields`, `${rest.length} fields, ${digest}`);
            }
        }
        const dc = await readOai(app.baseURL, ctx, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id17}`);
        const meta = dc.records[0] && dc.records[0].metadata;
        facts.dcDate = meta ? parseDc(meta).date : null;
        say('control oai_dc Date', JSON.stringify(facts.dcDate));
    } finally {
        record(process.env.PROBE_NAME || 'f008-facts', facts);
        await close();
        if (zone) zone.stop();
    }
});
