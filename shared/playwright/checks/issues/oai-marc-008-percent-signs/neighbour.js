// Neighbour check for docs/issues/U19-A15-oai-marc-008-percent-signs.md: what
// the fix must leave alone. OJS, signed out: the rest of each MARC record
// (every field but 008, both formats, ListRecords), the Dublin Core date of
// the same records (oai_dc ListRecords, <dc:date>), and article 1's page
// "Published" date. With the fix in and out the facts must match, 008 apart.
// Changes nothing; runs on a dataset fleet.
//
// Run: PROBE_FEATURE=issues-w15 PROBE_AGENT=w15 [PROBE_RUN=fixin] node bin/probe.js ojs shared/playwright/checks/issues/oai-marc-008-percent-signs/neighbour.js
const {forEachApp, launch, record, idle, screen} = require('../../../probe');

async function raw(page, app, query) {
    await page.goto(app.url(`/index.php/${app.contextPath}/oai?${query}`));
    await idle(page);
    return (await (await page.request.get(page.url())).text())
        .replace(/<responseDate>[^<]*<\/responseDate>/, '');
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    const {page, close} = await launch(app);
    try {
        for (const prefix of ['marcxml', 'oai_marc']) {
            const text = await raw(page, app, `verb=ListRecords&metadataPrefix=${prefix}`);
            facts[prefix] = {
                withoutOo8: text.replace(/<(controlfield tag|fixfield id)="008">[^<]*</g, '<$1="008">…<'),
                f008: [...text.matchAll(/<(?:controlfield tag|fixfield id)="008">([^<]*)</g)].map((m) => m[1]),
            };
        }
        const dc = await raw(page, app, 'verb=ListRecords&metadataPrefix=oai_dc');
        facts.dcDates = [...dc.matchAll(/<dc:date>([^<]*)<\/dc:date>/g)].map((m) => m[1]);
        await page.goto(app.url(`/index.php/${app.contextPath}/article/view/1`));
        await idle(page);
        const m = /Published\s*\n?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/.exec((await screen(page)).text.main || '');
        facts.published = m ? m[1] : null;
        facts.summary = {marcxml008: facts.marcxml.f008, oai_marc008: facts.oai_marc.f008, dcDates: facts.dcDates, published: facts.published,
            marcxmlLength: facts.marcxml.withoutOo8.length, oaiMarcLength: facts.oai_marc.withoutOo8.length};
        console.log(app.name, JSON.stringify(facts.summary));
    } finally {
        record('neighbour', facts);
        await close();
    }
});
