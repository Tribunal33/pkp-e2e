// Issue report docs/issues/U15-OMP3-OPS4-returned-item-gone-search-still-lists.md (U15 OMP3, OPS4): a
// published book or preprint returned to the workflow ("Return to Workflow", and on a server
// then declined) leaves the catalog and opens "404 Not Found" for a visitor, while the Search
// page keeps listing it. OJS article 17 is the control.
// Takes the report's Steps on PKP's default test dataset (OMP book 14, OPS preprint 12, OJS
// article 17), a second browser never signed in as the visitor:
//   1. visitor: "Search" for a title word (item listed), its page, its listing page
//   2. sign in as dbarnes, the item's workflow
//   3. "Return to Workflow" › "Confirm" (3.5: no such button, the step records that)
//   4. visitor: the item's page, its listing page and the OAI-PMH records (a harvester's read)
//   5. side menu "Production", "Decline Submission" › "Continue" … "Record Decision" (offered
//      on OPS only; the step records what Production offers)
//   6. visitor: "Search" for the word, the item's page, its listing page
//   7. dbarnes: the item's page
// NB=1 is the neighbour check for a fix trial, alone: another published item, untouched, is
// listed by the search and its page and listing open for the visitor, while never-published
// submissions (OMP 4, OPS 1 and the declined OPS 4) stay "404 Not Found" and unlisted.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/returned-item-gone-search-still-lists/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const ctx = app.contextPath;
    const item = nb ? L.OTHER[app.name] : L.ITEM[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps', item: item.id};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    const ed = await launch(app);
    const visitor = await launch(app); // never signed in
    const v = visitor.page;
    const page = ed.page;
    try {
        const readVisitor = async (n) => {
            if (n === 6 || nb) await step(`${n} visitor search "${item.word}"`, () => L.search(app, v, item.word, item.id));
            if (n === 6 || nb) record(`step${n}-search`, await screen(v));
            await step(`${n} visitor item page`, () => L.readPage(app, v, item.page(ctx)));
            record(`step${n}-page`, await screen(v));
            if (L.ITEM[app.name].list) await step(`${n} visitor listing`, () => L.listed(app, v, L.ITEM[app.name].list(ctx), item.id));
            await step(`${n} visitor OAI-PMH`, () => L.oaiListed(app, v, item.word));
        };
        if (nb) {
            await readVisitor('nb');
            for (const u of L.UNPUBLISHED[app.name]) {
                await step(`nb unpublished ${u.id} page`, () => L.readPage(app, v, u.page(ctx)));
                await step(`nb unpublished ${u.id} listing`, () => L.listed(app, v, L.ITEM[app.name].list(ctx), u.id));
            }
            return;
        }
        // 1
        await step('1 visitor search', () => L.search(app, v, item.word, item.id));
        record('step1-search', await screen(v));
        await readVisitor(1);
        // 2
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${item.id}`));
        await step('2 workflow header', () => L.header(page));
        record('step2-workflow', await screen(page));
        // 3
        await step('3 return to workflow', () => L.returnToWorkflow(page));
        record('step3-workflow', await screen(page));
        // 4
        await readVisitor(4);
        // 5
        await step('5 production', () => L.openProduction(page));
        await step('5 decline', () => L.decline(page));
        await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${item.id}`));
        await step('5 workflow header after', () => L.header(page));
        record('step5-workflow', await screen(page));
        // 6
        await readVisitor(6);
        // 7
        await step('7 dbarnes item page', () => L.readPage(app, page, item.page(ctx)));
        record('step7-page', await screen(page));
    } finally {
        record('walk-facts', facts);
        await ed.close();
        await visitor.close();
    }
});
