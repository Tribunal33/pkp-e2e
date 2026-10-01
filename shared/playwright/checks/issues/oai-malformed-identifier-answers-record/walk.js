// Issue report docs/issues/U19-A17-oai-malformed-identifier-answers-record.md
// (U19 A17): the report's Steps to reproduce, walked on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), context
// `publicknowledge`, signed out: the OAI-PMH address is public, and a
// browser's address bar sends what a harvester sends.
//
// The kit builds nothing and the walk changes nothing. {start} is the app's
// identifier start (`oai:{repository identifier}:publicationFormat/` on a
// press, `…:preprint/` on a preprint server, `…:article/` on a journal) and
// {n} the number of the first record the list names.
//   1. ListIdentifiers
//   2. GetRecord {start}{n}
//   3. GetRecord {start}{n}abc
//   4. GetRecord {start}abc
//   5. GetRecord {n}{start}             (the start in the middle)
//   6. ListMetadataFormats {start}{n}abc
//   7. the site-wide address, GetRecord {start}{n}abc
//   8. control: GetRecord foo
// Neighbour (`neighbour` as the script's argument, with the fix in and out):
//   what the fix must leave alone: GetRecord of the record, of a number no
//   record has, of `foo` and of another repository's identifier;
//   ListMetadataFormats of the record and of a number no record has;
//   ListRecords; the site-wide GetRecord of the record.
//
// Reset first:  npm run fleet-prep -- --feature issues-a17 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-a17 PROBE_AGENT=a17 node bin/probe.js all shared/playwright/checks/issues/oai-malformed-identifier-answers-record/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a17-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a17-3_5 PROBE_AGENT=a17 node bin/probe.js all shared/playwright/checks/issues/oai-malformed-identifier-answers-record/walk.js
// Facts: .reports/<feature>/a17/facts[-<run>]-<app>.json
const {forEachApp, launch, screen, shot, record} = require('../../../probe');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');

/** Open one OAI-PMH address as a browser does; read the raw XML beside it. */
async function ask(page, app, name, path) {
    const out = {step: name, path};
    const response = await page.goto(app.url(path), {waitUntil: 'load'}).catch((e) => ({error: e.message}));
    out.status = response && response.status ? response.status() : null;
    if (response && response.error) out.gotoError = flat(response.error, 200);
    const s = await screen(page).catch(() => null);
    out.shown = s ? {title: s.title, text: flat(s.text.main || s.text.header || (await page.locator('body').innerText().catch(() => '')), 400)} : null;
    const raw = await page.request.get(app.url(path));
    const xml = await raw.text();
    out.rawStatus = raw.status();
    out.length = xml.length;
    out.identifiers = (xml.match(/<identifier>([^<]+)<\/identifier>/g) || []).map((x) => x.replace(/<[^>]+>/g, ''));
    out.records = (xml.match(/<record>/g) || []).length;
    out.formats = (xml.match(/<metadataPrefix>([^<]+)<\/metadataPrefix>/g) || []).map((x) => x.replace(/<[^>]+>/g, ''));
    const error = xml.match(/<error code="([^"]+)">([^<]*)<\/error>/);
    out.oaiError = error ? `${error[1]}: ${error[2]}` : null;
    out.title = (xml.match(/<dc:title[^>]*>([^<]+)</) || [])[1] || null;
    out.request = flat((xml.match(/<request[^>]*>[^<]*<\/request>/) || [])[0], 300);
    out.head = flat(xml, 200);
    return out;
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const base = `/index.php/${app.contextPath}/oai`;
    const site = '/index.php/index/oai';
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, results: []};
    const step = async (name, path) => {
        const r = await ask(page, app, name, path);
        facts.results.push(r);
        return r;
    };
    const get = (identifier, address = base) => `${address}?verb=GetRecord&metadataPrefix=oai_dc&identifier=${identifier}`;
    const formats = (identifier) => `${base}?verb=ListMetadataFormats&identifier=${identifier}`;
    try {
        const list = await step(NEIGHBOUR ? 'n0 list' : '1 list', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc`);
        const first = list.identifiers[0];
        const m = first && first.match(/^(oai:[^:]+:[A-Za-z]+\/)(\d+)$/);
        if (!m) throw new Error(`no identifier to start from: ${first}`);
        const [, start, n] = m;
        facts.start = start;
        facts.n = n;
        if (NEIGHBOUR) {
            await step('n1 the record', get(`${start}${n}`));
            await step('n2 no such number', get(`${start}99999`));
            await step('n3 foo', get('foo'));
            await step('n4 other repository', get(`oai:other.example:${start.split(':')[2]}${n}`));
            await step('n5 formats of the record', formats(`${start}${n}`));
            await step('n6 formats no such number', formats(`${start}99999`));
            await step('n7 records', `${base}?verb=ListRecords&metadataPrefix=oai_dc`);
            await step('n8 site the record', get(`${start}${n}`, site));
        } else {
            await step('2 the record', get(`${start}${n}`));
            await step('3 number then letters', get(`${start}${n}abc`));
            await shot(page, 'number-then-letters').catch(() => {});
            await step('4 letters', get(`${start}abc`));
            await step('5 start in the middle', get(`${n}${start}`));
            await step('6 formats number then letters', formats(`${start}${n}abc`));
            await step('7 site number then letters', get(`${start}${n}abc`, site));
            await step('8 foo', get('foo'));
        }
    } finally {
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        for (const r of facts.results) {
            console.log(
                `[fact] ${app.name} ${r.step.padEnd(30)} ${r.status}/${r.rawStatus} records ${r.records} ids ${r.identifiers.join(',') || '-'}` +
                    `${r.formats.length ? ` formats ${r.formats.join(',')}` : ''}${r.oaiError ? ` error "${r.oaiError}"` : ''}${r.title ? ` title "${flat(r.title, 50)}"` : ''}`
            );
        }
        await close();
    }
});
