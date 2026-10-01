// Issue report docs/issues/U19-OPS1-preprint-server-oai-until-fails.md
// (U19 OPS1): the report's Steps to reproduce, walked on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), context
// `publicknowledge`, signed out: the OAI-PMH address is public, and a
// browser's address bar sends what a harvester sends.
//
// The kit builds nothing and the walk changes nothing.
//   1. Identify
//   2. ListIdentifiers with no date
//   3. ListIdentifiers with until = today
//   4. ListRecords with until = today
//   5. ListIdentifiers with from = 2000-01-01 and until = today
//   6. ListIdentifiers with until = today's last second (the long form)
//   7. ListIdentifiers with until = 2000-01-01 (before every record)
//   8. the site-wide address, ListIdentifiers with until = today
//   9. control: ListIdentifiers with from = 2000-01-01 alone
// OJS and OMP take the same steps as controls (OPS alone shows the fault).
// Neighbour (`neighbour` as the script's argument, with the fix in and out):
//   the lists the fix must leave alone: no date, `from` today, `from`
//   tomorrow, the section's set, ListRecords with no date, and GetRecord of
//   the first identifier.
//
// Reset first:  npm run fleet-prep -- --feature issues-ops1 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ops1 PROBE_AGENT=ops1 node bin/probe.js all shared/playwright/checks/issues/preprint-server-oai-until-fails/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ops1-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ops1-3_5 PROBE_AGENT=ops1 node bin/probe.js all shared/playwright/checks/issues/preprint-server-oai-until-fails/walk.js
// Facts: .reports/<feature>/ops1/facts[-<run>]-<app>.json
const {forEachApp, launch, screen, shot, record} = require('../../../probe');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');
const day = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

/** Open one OAI-PMH address as a browser does; read the raw XML beside it. */
async function ask(page, app, name, path) {
    const out = {step: name, path};
    const response = await page.goto(app.url(path), {waitUntil: 'load'}).catch((e) => ({error: e.message}));
    out.status = response && response.status ? response.status() : null;
    if (response && response.error) out.gotoError = flat(response.error, 200);
    const s = await screen(page).catch(() => null);
    out.shown = s ? {title: s.title, text: flat(s.text.main || s.text.header || (await page.locator('body').innerText().catch(() => '')), 240)} : null;
    const raw = await page.request.get(app.url(path));
    const xml = await raw.text();
    out.rawStatus = raw.status();
    out.contentType = raw.headers()['content-type'] || null;
    out.length = xml.length;
    out.identifiers = (xml.match(/<identifier>/g) || []).length;
    out.deleted = (xml.match(/<header status="deleted">/g) || []).length;
    out.records = (xml.match(/<record>/g) || []).length;
    const error = xml.match(/<error code="([^"]+)">([^<]*)<\/error>/);
    out.oaiError = error ? `${error[1]}: ${error[2]}` : null;
    out.resumption = /<resumptionToken[^>]*>[^<]+</.test(xml);
    out.firstIdentifier = (xml.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || null;
    out.head = flat(xml, 200);
    return out;
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const base = `/index.php/${ctx}/oai`;
    const site = '/index.php/index/oai';
    const today = day();
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, today, results: []};
    const step = async (name, path) => {
        const r = await ask(page, app, name, path);
        facts.results.push(r);
        return r;
    };
    try {
        if (NEIGHBOUR) {
            const set = `${ctx}:${{ojs: 'ART', ops: 'PRE'}[app.name] || ''}`;
            const all = await step('n1 no date', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc`);
            await step('n2 from today', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&from=${today}`);
            await step('n3 from tomorrow', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&from=${day(1)}`);
            if (app.name !== 'omp') await step('n4 section set', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&set=${encodeURIComponent(set)}`);
            await step('n5 records no date', `${base}?verb=ListRecords&metadataPrefix=oai_dc`);
            if (all.firstIdentifier) {
                await step('n6 get record', `${base}?verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(all.firstIdentifier)}`);
            }
            await step('n7 site no date', `${site}?verb=ListIdentifiers&metadataPrefix=oai_dc`);
        } else {
            await step('1 identify', `${base}?verb=Identify`);
            await step('2 no date', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc`);
            await step('3 until today', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&until=${today}`);
            await shot(page, 'until-today').catch(() => {});
            await step('4 records until today', `${base}?verb=ListRecords&metadataPrefix=oai_dc&until=${today}`);
            await step('5 from and until', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2000-01-01&until=${today}`);
            await step('6 until long form', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&until=${today}T23:59:59Z`);
            await step('7 until 2000', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&until=2000-01-01`);
            await step('8 site until today', `${site}?verb=ListIdentifiers&metadataPrefix=oai_dc&until=${today}`);
            await step('9 from alone', `${base}?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2000-01-01`);
        }
    } finally {
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        for (const r of facts.results) {
            console.log(
                `[fact] ${app.name} ${r.step.padEnd(22)} ${r.status}/${r.rawStatus} ids ${r.identifiers} (deleted ${r.deleted}) records ${r.records}` +
                    `${r.oaiError ? ` error "${r.oaiError}"` : ''}${r.resumption ? ' resumption' : ''}${r.rawStatus >= 400 ? ` shown: ${flat(r.shown && r.shown.text, 120)} | raw: ${flat(r.head, 120)}` : ''}`
            );
        }
        await close();
    }
});
