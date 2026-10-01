// Issue report docs/issues/U19-OMP4-book-without-abstract-oai-lists-fail.md (U19 OMP4):
// the report's Steps to reproduce, walked on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), press `publicknowledge`, as `dbarnes`.
// The kit builds nothing; everything goes through the screens.
//   1.  ListRecords at the press, signed out (two records)
//   2.  sign in as dbarnes, open submission 14
//   3.  "Unpublish", confirmed
//   4.  Publication › "Title & Abstract": "Abstract" emptied, "Save"
//   5.  "Publish", "Publish"
//   6.  the book's catalog page
//   7.  ListRecords at the press
//   8.  the site-wide ListRecords, plain and with set=publicknowledge
//   9.  GetRecord of book 14's format, and of book 5's
//   10. ListIdentifiers at the press
//   11. way round: "Unpublish", an abstract typed, "Save", "Publish"
//   12. ListRecords at the press
// Neighbour (`neighbour` as the script's argument, with the fix in and out, on a
// freshly reset dataset): the same lists and GetRecord with both books' abstracts in
// place; nothing is changed, and each record's XML is kept to compare the two runs.
//
// Reset first:  npm run fleet-prep -- --feature issues-omp4 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-omp4 PROBE_AGENT=omp4 node bin/probe.js omp shared/playwright/checks/issues/book-without-abstract-oai-lists-fail/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-omp4-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-omp4-3_5 PROBE_AGENT=omp4 node bin/probe.js omp shared/playwright/checks/issues/book-without-abstract-oai-lists-fail/walk.js
// Facts: .reports/<feature>/omp4/facts[-<run>]-omp.json (neighbour[-<run>]-omp.json)
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');
const {unpublish} = require('../oai-own-address-loses-deleted-records/lib');
const {publishShownVersion} = require('../older-version-tab-current-title/lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const BOOK = {id: 14, title: 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots'};
const LIST = 'verb=ListRecords&metadataPrefix=oai_dc';
const get = (id) => `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`;

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // the press's adapter; OJS casts, OPS has its own report
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const log = L.serverLog(app);
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, log: log.file, steps: []};
    const fact = (step, data) => {
        facts.steps.push({step, ...data});
        const r = data.records ? ` records ${data.records.length} [${data.records.map((x) => `${x.identifier.split(':').pop()} descriptions ${x.descriptions.length} elements ${x.elements}`).join('; ')}]` : '';
        console.log(`[fact] ${step.padEnd(34)} ${data.status ?? data.save ?? data.publish ?? ''}${data.shownStatus !== undefined ? `/${data.shownStatus}` : ''}${r}${data.identifiers && !data.records.length ? ` ids ${data.identifiers.length}` : ''}${data.error ? ` error "${data.error}"` : ''}${data.status >= 400 ? ` length ${data.length} shown "${data.shown}"` : ''}`);
        return data;
    };
    const ask = async (step, where, params, name) => {
        const data = {...(await L.oai(app, where, params)), ...(await L.view(page, app, where, params))};
        if (name) await shot(page, name).catch(() => {});
        return fact(step, data);
    };
    const edit = async (step, text) => {
        fact(`${step} unpublish`, await unpublish(page, app, ctx, BOOK.id));
        const saved = await L.setAbstract(page, app, text);
        record(`${step}-title-abstract`, await screen(page));
        fact(`${step} abstract saved`, saved);
        const published = await publishShownVersion(page);
        fact(`${step} publish`, published);
        const stored = sql(app, `select locale, length(setting_value) from publication_settings where publication_id = (select current_publication_id from submissions where submission_id = ${BOOK.id}) and setting_name = 'abstract'`);
        fact(`${step} stored abstract rows`, {stored: stored || '(none)'});
    };
    try {
        const first = await ask('1 press list', ctx, LIST, 'list-before');
        const own = (first.records.find((r) => (r.title || '').startsWith('From Bricks')) || {}).identifier;
        const other = (first.records.find((r) => r.identifier !== own) || {}).identifier;
        facts.identifiers = {book14: own, book5: other};
        if (NEIGHBOUR) {
            await ask('n2 site list', 'index', LIST);
            await ask('n3 site list, set', 'index', `${LIST}&set=${ctx}`);
            if (own) await ask('n4 GetRecord book 14', ctx, get(own));
            if (other) await ask('n5 GetRecord book 5', ctx, get(other));
            await ask('n6 press identifiers', ctx, 'verb=ListIdentifiers&metadataPrefix=oai_dc');
            return;
        }
        await signIn(page, 'dbarnes');
        await edit('3-5', null);
        const book = await page.goto(app.url(`/index.php/${ctx}/en/catalog/book/${BOOK.id}`));
        await idle(page);
        const body = await page.locator('body').innerText();
        record('6-catalog-book', await screen(page));
        fact('6 catalog page', {status: book.status(), heading: L.flat(await page.locator('h1').first().innerText().catch(() => null), 120), abstractHeading: /\bAbstract\b|\bSynopsis\b/.test(body)});
        await ask('7 press list', ctx, LIST, 'list-after');
        await ask('8 site list', 'index', LIST);
        await ask('8 site list, set', 'index', `${LIST}&set=${ctx}`);
        if (own) await ask('9 GetRecord book 14', ctx, get(own), 'getrecord-book14');
        if (other) await ask('9 GetRecord book 5', ctx, get(other));
        await ask('10 press identifiers', ctx, 'verb=ListIdentifiers&metadataPrefix=oai_dc');
        facts.serverLog = log.since();
        for (const l of facts.serverLog) console.log(`[log] ${l}`);
        await edit('11', 'Abstract u19omp4');
        await ask('12 press list', ctx, LIST, 'list-way-round');
        await signOut(page).catch(() => {});
    } finally {
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        await close();
    }
});
