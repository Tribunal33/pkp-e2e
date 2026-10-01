// Issue report docs/issues/U19-A16-oai-argument-twice-server-error.md
// (U19 A16): the report's Steps to reproduce, walked on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), context
// `publicknowledge`, signed out: the OAI-PMH address is public, and a
// browser's address bar sends what a harvester sends.
//
// The kit builds nothing and the walk changes nothing.
//   1. ListRecords, each argument once (control)
//   2. ListRecords with metadataPrefix twice
//   3. ListIdentifiers with set twice
//   4. ListIdentifiers with from twice
//   5. GetRecord with identifier twice
//   6. ListMetadataFormats with identifier twice
//   7. ListRecords with resumptionToken twice
//   8. Identify with verb twice
//   9. the site-wide address, ListRecords with metadataPrefix twice
//  10. Identify, each argument once (the next request)
//  11. Identify with an argument it does not take, twice (control)
// Neighbour (`neighbour` as the script's argument, with the fix in and out):
//   the requests the fix must leave alone: each verb with its arguments
//   once, and the other refusals (a missing argument, an illegal one, an
//   unknown verb, no verb, an unknown resumption token, an unknown format).
//
// Reset first:  npm run fleet-prep -- --feature issues-a16 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-a16 PROBE_AGENT=a16 node bin/probe.js all shared/playwright/checks/issues/oai-argument-twice-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a16-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a16-3_5 PROBE_AGENT=a16 node bin/probe.js all shared/playwright/checks/issues/oai-argument-twice-server-error/walk.js
// Facts: .reports/<feature>/a16/facts[-<run>]-<app>.json
const {forEachApp, launch, screen, shot, record} = require('../../../probe');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');

/** Open one OAI-PMH address as a browser does; read the raw XML beside it. */
async function ask(page, app, name, path) {
    const out = {step: name, path};
    const response = await page.goto(app.url(path), {waitUntil: 'load'}).catch((e) => ({error: e.message}));
    out.status = response && response.status ? response.status() : null;
    if (response && response.error) out.gotoError = flat(response.error, 200);
    out.landed = page.url().replace(app.baseURL, '');
    const s = await screen(page).catch(() => null);
    out.shown = s ? {title: s.title, text: flat(s.text.main || s.text.header || (await page.locator('body').innerText().catch(() => '')), 240)} : null;
    const raw = await page.request.get(app.url(path));
    const xml = await raw.text();
    out.rawStatus = raw.status();
    out.contentType = raw.headers()['content-type'] || null;
    out.length = xml.length;
    out.identifiers = (xml.match(/<identifier>/g) || []).length;
    out.records = (xml.match(/<record>/g) || []).length;
    const error = xml.match(/<error code="([^"]+)">([^<]*)<\/error>/);
    out.oaiError = error ? `${error[1]}: ${error[2]}` : null;
    out.request = (xml.match(/<request[^>]*>/) || [])[0] || null;
    out.answer = (xml.match(/<(Identify|ListRecords|ListIdentifiers|ListSets|ListMetadataFormats|GetRecord)>/) || [])[1] || null;
    out.firstIdentifier = (xml.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || null;
    out.head = flat(xml, 200);
    return out;
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const base = `/index.php/${ctx}/oai`;
    const site = '/index.php/index/oai';
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, results: []};
    const step = async (name, path) => {
        const r = await ask(page, app, name, path);
        facts.results.push(r);
        return r;
    };
    try {
        if (NEIGHBOUR) {
            await step('n1 identify', `${base}?verb=Identify`);
            const all = await step('n2 identifiers', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc`);
            await step('n3 records', `${base}?verb=ListRecords&metadataPrefix=oai_dc`);
            await step('n4 sets', `${base}?verb=ListSets`);
            await step('n5 formats', `${base}?verb=ListMetadataFormats`);
            if (all.firstIdentifier) {
                await step('n6 get record', `${base}?verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(all.firstIdentifier)}`);
                await step('n7 formats of record', `${base}?verb=ListMetadataFormats&identifier=${encodeURIComponent(all.firstIdentifier)}`);
            }
            await step('n8 from and until', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2000-01-01&until=2000-01-02`);
            await step('n9 missing prefix', `${base}?verb=ListRecords`);
            await step('n10 illegal once', `${base}?verb=Identify&foo=1`);
            await step('n11 unknown verb', `${base}?verb=identify`);
            await step('n12 no verb', `${base}`);
            await step('n13 unknown token', `${base}?verb=ListRecords&resumptionToken=u19a16`);
            await step('n14 unknown format', `${base}?verb=ListRecords&metadataPrefix=u19a16`);
            await step('n15 token and prefix', `${base}?verb=ListRecords&resumptionToken=u19a16&metadataPrefix=oai_dc`);
            await step('n16 site identify', `${site}?verb=Identify`);
        } else {
            await step('1 records once', `${base}?verb=ListRecords&metadataPrefix=oai_dc`);
            await step('2 prefix twice', `${base}?verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc`);
            await shot(page, 'prefix-twice').catch(() => {});
            await step('3 set twice', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&set=${ctx}&set=${ctx}`);
            await step('4 from twice', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2000-01-01&from=2001-01-01`);
            await step('5 get identifier twice', `${base}?verb=GetRecord&metadataPrefix=oai_dc&identifier=x&identifier=y`);
            await step('6 formats identifier twice', `${base}?verb=ListMetadataFormats&identifier=x&identifier=y`);
            await step('7 token twice', `${base}?verb=ListRecords&resumptionToken=a&resumptionToken=b`);
            await step('8 verb twice', `${base}?verb=Identify&verb=Identify`);
            await step('9 site prefix twice', `${site}?verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc`);
            await step('10 identify after', `${base}?verb=Identify`);
            await step('11 illegal twice', `${base}?verb=Identify&foo=1&foo=2`);
        }
    } finally {
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        for (const r of facts.results) {
            console.log(
                `[fact] ${app.name} ${r.step.padEnd(27)} ${r.status}/${r.rawStatus} ${r.answer || '-'} ids ${r.identifiers} records ${r.records}` +
                    `${r.oaiError ? ` error "${r.oaiError}"` : ''}${r.rawStatus >= 400 ? ` landed ${r.landed} | shown: "${flat(r.shown && r.shown.text, 120)}" | raw ${r.length} bytes ${r.contentType}` : ''}`
            );
        }
        await close();
    }
});
