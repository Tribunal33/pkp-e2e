// Issue report docs/issues/U19-A5-oai-browser-record-formats-shown-as-archive.md (U19 A5): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), context `publicknowledge`, signed out: the OAI-PMH address is public.
//
// The kit builds nothing and the walk changes nothing.
//   1. ListRecords in oai_dc
//   2. "formats" beside the first record's identifier
//   3. the "metadataPrefix" link of the first "Metadata Format" block
//   control: the request link "ListMetadataFormats" (no record named)
// With the fix in, step 2 offers one link per format after "Use these links to view the
//   metadata:"; the walk presses each and reads the record it opens.
// Neighbour (in the same walk, with the fix in and out): the request link "ListMetadataFormats"
//   keeps "… available from this archive." with no record links; the "Metadata Format" blocks
//   and their "metadataPrefix" links (step 3) stay as they are; "oai_dc" beside the identifier
//   still opens the record; a record that does not exist is still refused.
//
// Reset first:  npm run fleet-prep -- --feature issues-a4 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-a4 PROBE_AGENT=a4 node bin/probe.js all shared/playwright/checks/issues/oai-browser-record-formats-shown-as-archive/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a4-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a4-3_5 PROBE_AGENT=a4 node bin/probe.js all shared/playwright/checks/issues/oai-browser-record-formats-shown-as-archive/walk.js
// Facts: .reports/<feature>/a4/formats-facts[-<run>]-<app>.json
const {forEachApp, launch, record, shot, screen} = require('../../../probe');
const {flat, openView, pressLink} = require('../oai-browser-last-part-says-more-results/lib');

/** What the formats page shows: its sentence, the links in it, and the "Metadata Format" blocks. */
async function formatsPage(page) {
    const sentence = page.locator('p').filter({hasText: /^\s*This is a list of metadata formats/}).first();
    const links = sentence.getByRole('link');
    const blocks = page.locator('h2:text-is("Metadata Format") + table');
    return {
        sentence: flat(await sentence.innerText()),
        sentenceLinks: await links.evaluateAll((as) => as.map((a) => ({name: a.textContent.trim(), href: a.getAttribute('href')}))),
        blocks: await blocks.count(),
        blockLinks: await blocks
            .locator('tr:first-child a')
            .evaluateAll((as) => as.map((a) => ({name: a.textContent.trim(), href: a.getAttribute('href')}))),
    };
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const list = app.url(`/index.php/${ctx}/oai?verb=ListRecords&metadataPrefix=oai_dc`);
    const facts = {line: app.line, dataset: app.dataset};
    const say = (name, text) => console.log(`[fact] ${app.name} ${name.padEnd(30)} ${text}`);
    try {
        // Step 1.
        const s1 = await openView(page, list);
        const identifier = s1.records[0];
        facts.step1 = {status: s1.status, url: s1.url, records: s1.records};
        say('1 ListRecords', `${s1.status} records ${s1.records.length}, the first ${identifier}`);
        const header = page.locator('h3:text-is("OAI Record Header") + table, table.values').filter({hasText: identifier}).first();

        // Step 2.
        const s2 = await pressLink(page, 'formats', header);
        const f2 = await formatsPage(page);
        facts.step2 = {status: s2.status, url: s2.url, request: s2.request, ...f2, screen: await screen(page).then((s) => flat(s.text.main || '', 1500)).catch(() => null)};
        say('2 "formats"', `${s2.status} ${s2.url.replace(/^.*\?/, '?')}`);
        say('2 request element', s2.request);
        say('2 sentence', JSON.stringify(f2.sentence));
        say('2 links in the sentence', JSON.stringify(f2.sentenceLinks));
        say('2 blocks', `${f2.blocks}: ${JSON.stringify(f2.blockLinks)}`);
        await shot(page, 'formats-of-record');
        const formatsUrl = page.url();

        // With the fix: each link of the sentence opens the record in that format.
        facts.recordLinks = [];
        for (const link of f2.sentenceLinks) {
            await page.goto(formatsUrl, {waitUntil: 'load'});
            const sentence = page.locator('p').filter({hasText: /^\s*This is a list of metadata formats/}).first();
            const v = await pressLink(page, link.name, sentence);
            const got = {format: link.name, status: v.status, url: v.url, error: v.error, records: v.records};
            facts.recordLinks.push(got);
            say(`2 link ${link.name}`, `${v.status} ${v.error ? `error "${v.error}"` : `records ${JSON.stringify(v.records)}`}`);
        }

        // Step 3.
        await page.goto(formatsUrl, {waitUntil: 'load'});
        const block = page.locator('h2:text-is("Metadata Format") + table').first();
        const prefix = (await block.locator('tr:first-child a').innerText()).trim();
        const s3 = await pressLink(page, prefix, block);
        facts.step3 = {prefix, status: s3.status, url: s3.url, error: s3.error, records: s3.records};
        say(`3 metadataPrefix ${prefix}`, `${s3.status} ${s3.url.replace(/^.*\?/, '?')} records ${s3.records.length}`);
        await shot(page, 'format-block-link');

        // Control: the request link "ListMetadataFormats".
        await page.goto(list, {waitUntil: 'load'});
        const c = await pressLink(page, 'ListMetadataFormats', page.locator('ul.quicklinks').first());
        const fc = await formatsPage(page);
        facts.control = {status: c.status, url: c.url, request: c.request, ...fc};
        say('control ListMetadataFormats', `${c.status} ${JSON.stringify(fc.sentence)} links ${fc.sentenceLinks.length} blocks ${fc.blocks}`);
        await shot(page, 'formats-of-archive');

        // Neighbours: "oai_dc" beside the identifier; a record that does not exist.
        await page.goto(list, {waitUntil: 'load'});
        const header2 = page.locator('table.values').filter({hasText: identifier}).first();
        const n1 = await pressLink(page, 'oai_dc', header2);
        facts.neighbourGetRecord = {status: n1.status, url: n1.url, error: n1.error, records: n1.records};
        say('n1 "oai_dc" on the header', `${n1.status} records ${JSON.stringify(n1.records)}${n1.error ? ` error "${n1.error}"` : ''}`);
        const missing = identifier.replace(/\d+$/, '99999');
        const n2 = await openView(page, app.url(`/index.php/${ctx}/oai?verb=ListMetadataFormats&identifier=${encodeURIComponent(missing)}`));
        facts.neighbourMissing = {identifier: missing, status: n2.status, error: n2.error, errorShown: n2.errorShown, formatsSentence: n2.formatsSentence};
        say('n2 formats of no record', `${n2.status} error "${n2.error}" sentence ${JSON.stringify(n2.formatsSentence)}`);
    } finally {
        record('formats-facts', facts);
        await close();
    }
});
