// Issue report walk: docs/issues/U19-A15-oai-marc-008-percent-signs.md (spec
// U19 register A15). Takes the report's Steps on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), signed out:
//   OJS: article 1's "Published" date on its page; then ListRecords in
//        marcxml and in oai_marc, each record's field 008 (raw answer) and
//        the page the browser shows for it.
//   OMP, OPS: the same two ListRecords, which must answer
//        cannotDisseminateFormat (no MARC formats there).
// Changes nothing, builds nothing.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w15 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w15 PROBE_AGENT=w15 node bin/probe.js all shared/playwright/checks/issues/oai-marc-008-percent-signs/walk.js
// 3.5:          both with PKP_E2E_LINE=stable-3_5_0 in front (feature issues-w15-3_5; PROBE_RUN=r35 on the walk).
// With a fix applied: PROBE_RUN=fixin.
// Facts: .reports/<feature>/w15/walk[-<run>]-<app>.json
const {forEachApp, launch, screen, record, idle} = require('../../../probe');

// Field 008 of every record in a raw OAI-PMH answer, both MARC formats.
function read008(raw) {
    const records = raw.split('<record>').slice(1).map((rec) => ({
        identifier: ((rec.match(/<identifier>([^<]+)<\/identifier>/) || [])[1]) || null,
        f008: ((rec.match(/<(?:controlfield tag|fixfield id)="008">([^<]*)</) || [])[1]) ?? null,
    }));
    const error = /<error code="([^"]+)"/.exec(raw);
    return {records, error: error ? error[1] : null};
}

async function listRecords(page, app, prefix) {
    await page.goto(app.url(`/index.php/${app.contextPath}/oai?verb=ListRecords&metadataPrefix=${prefix}`));
    await idle(page);
    const shown = await screen(page);
    const raw = await (await page.request.get(page.url())).text();
    return {url: page.url(), ...read008(raw), shownHas008: /008/.test(shown.text.main || shown.text.body || JSON.stringify(shown.text)), shown};
}

async function publishedDate(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${id}`));
    await idle(page);
    const shown = await screen(page);
    const text = shown.text.main || '';
    const m = /Published\s*\n?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/.exec(text);
    return {url: page.url(), published: m ? m[1] : null};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    const {page, close} = await launch(app);
    try {
        if (app.name === 'ojs') facts.article1 = await publishedDate(page, app, 1);
        facts.marcxml = await listRecords(page, app, 'marcxml');
        facts.oai_marc = await listRecords(page, app, 'oai_marc');
        facts.summary = {
            published: facts.article1 ? facts.article1.published : null,
            marcxml: facts.marcxml.error || facts.marcxml.records.map((r) => `${r.identifier}: ${r.f008}`),
            oai_marc: facts.oai_marc.error || facts.oai_marc.records.map((r) => `${r.identifier}: ${r.f008}`),
        };
        console.log(app.name, JSON.stringify(facts.summary));
    } finally {
        record('walk', facts);
        await close();
    }
});
