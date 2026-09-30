// Neighbour check for docs/issues/U19-A5-oai-record-formats-shown-as-archive.md:
// what the fix must leave alone, on the same fleet as walk.js. No sign-in;
// nothing changes.
//   a. The top link "ListMetadataFormats" (no identifier): "… available from
//      this archive." and no record links, before and after the fix.
//   b. ListMetadataFormats for an identifier the address does not hold
//      (typed): the "OAI Error(s)" block, no paragraph, before and after.
//   c. A record page (GetRecord, via the header's "oai_dc" link): its
//      "oai_dc" and "formats" links unchanged.
// Run:  PROBE_FEATURE=issues-w09 PROBE_AGENT=w09 PROBE_RUN=n<x> node bin/probe.js all shared/playwright/checks/issues/oai-record-formats-shown-as-archive/neighbour.js
const {forEachApp, launch, record, idle} = require('../../../probe');
const {readFormats} = require('./formats');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    const oai = `/index.php/${app.contextPath}/oai`;
    try {
        await page.goto(app.url(oai));
        await idle(page);
        await page.getByRole('link', {name: 'ListMetadataFormats', exact: true}).first().click();
        await page.waitForLoadState('load');
        await idle(page);
        facts.archive = await readFormats(page);
        await page.goto(app.url(`${oai}?verb=ListMetadataFormats&identifier=oai:u19w09:article/999999`));
        await idle(page);
        facts.unknown = await readFormats(page);
        await page.goto(app.url(`${oai}?verb=ListIdentifiers&metadataPrefix=oai_dc`));
        await idle(page);
        await page.getByRole('link', {name: 'oai_dc', exact: true}).first().click();
        await page.waitForLoadState('load');
        await idle(page);
        const t = await page.locator('body').innerText();
        facts.record = {
            url: page.url(),
            record: ((t.match(/OAI Record: ([^\n]+)/) || [])[1]) || null,
            headerLinks: await page.locator('a.link').evaluateAll((as) => as.slice(0, 2).map((a) => `${a.textContent.trim()} ${a.getAttribute('href')}`)),
        };
        facts.summary = {
            archive: {intro: facts.archive.intro, introLinks: facts.archive.introLinks.length, prefixes: facts.archive.prefixes},
            unknown: {intro: facts.unknown.intro, error: facts.unknown.error && facts.unknown.error.replace(/\s+/g, ' ').slice(0, 120)},
            record: facts.record,
        };
        console.log(app.name, JSON.stringify(facts.summary));
    } finally {
        record('neighbour', facts);
        await close();
    }
});
