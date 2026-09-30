// Issue report walk: docs/issues/U19-A5-oai-record-formats-shown-as-archive.md
// (spec U19 register A5). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), in the browser,
// no sign-in: the context's ListIdentifiers page ("OAI 2.0 Request
// Results"), "formats" on the first record header, the paragraph above the
// "Metadata Format" blocks, and each record link that paragraph offers.
// The kit builds nothing and the walk changes nothing.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w09 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w09 PROBE_AGENT=w09 node bin/probe.js all shared/playwright/checks/issues/oai-record-formats-shown-as-archive/walk.js
// 3.5:          both with PKP_E2E_LINE=stable-3_5_0 in front (feature issues-w09-3_5; PROBE_RUN=r35 on the walk).
// Facts: .reports/<feature>/w09/walk[-<run>]-<app>.json
const {forEachApp, launch, screen, record, idle} = require('../../../probe');
const {readFormats} = require('./formats');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    try {
        // Step 1: ListIdentifiers in Dublin Core.
        await page.goto(app.url(`/index.php/${app.contextPath}/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`));
        await idle(page);
        const body = await page.locator('body').innerText();
        facts.firstIdentifier = ((body.match(/^OAI Identifier\s*\t?\s*(\S+)/m) || [])[1]) || null;
        // Step 2: "formats" on the first record header.
        const formats = page.getByRole('link', {name: 'formats', exact: true}).first();
        facts.formatsHref = await formats.getAttribute('href');
        await formats.click();
        await page.waitForLoadState('load');
        await idle(page);
        // Step 3: the paragraph above the first "Metadata Format" block.
        facts.formatsPage = await readFormats(page);
        facts.formatsScreen = await screen(page);
        // Step 4: each record link the paragraph offers.
        facts.recordLinks = [];
        for (const link of facts.formatsPage.introLinks) {
            await page.goto(new URL(link.href, page.url()).toString());
            await idle(page);
            const t = await page.locator('body').innerText();
            facts.recordLinks.push({
                link: link.text,
                url: page.url(),
                record: ((t.match(/OAI Record: ([^\n]+)/) || [])[1]) || null,
                metadata: ((t.match(/(Dublin Core Metadata \(oai_dc\)|Unknown Metadata Format)/) || [])[1]) || null,
                error: /OAI Error\(s\)/.test(t) ? t.slice(t.indexOf('OAI Error(s)'), t.indexOf('OAI Error(s)') + 200) : null,
            });
        }
        facts.summary = {
            identifier: facts.firstIdentifier,
            formatsHref: facts.formatsHref,
            intro: facts.formatsPage.intro,
            introLinks: facts.formatsPage.introLinks.map((l) => l.text),
            prefixes: facts.formatsPage.prefixes,
            requestElement: facts.formatsPage.requestElement,
            recordLinksOpen: facts.recordLinks.map((r) => `${r.link}: ${r.record || r.error} (${r.metadata})`),
        };
        console.log(app.name, JSON.stringify(facts.summary));
    } finally {
        record('walk', facts);
        await close();
    }
});
