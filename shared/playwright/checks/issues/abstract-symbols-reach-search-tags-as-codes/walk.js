// Issue report docs/issues/U20-A7-abstract-symbols-reach-search-tags-as-codes.md (U20 A7): an
// "&" or "<" in an abstract reaches the item page's "citation_abstract" and "DC.Description"
// tags escaped twice, so indexes read "&amp;" and "&lt;".
// Takes the report's Steps on PKP's default test dataset, all three apps (OJS submission 17,
// OMP 14, OPS 12):
//   1. signed out, the item's page: the abstract tags (OPS 12's own abstract holds "(P<0.01)")
//   2. sign in as dbarnes
//   3. the submission's workflow
//   4-5. Publication › "Title & Abstract": "Abstract" replaced by the text below, "Save"
//   6. the item's page again
//   7. OMP: a book file's page, reached from the book page
// NB=1 is the neighbour check for a fix trial, alone: other dataset items' tags read signed out
// (no "&" or "<" in them: unchanged by a fix), then the abstract replaced by markup-like text
// with quote marks over two paragraphs, which must stay text, escaped once, one tag per language.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/abstract-symbols-reach-search-tags-as-codes/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const L = require('./lib');

const TEXT = 'Soil & water quality improved (P<0.01).';
const NB_TEXT = 'Typed <b>tag</b> and "quotes".\nSecond paragraph.';
const NB_OTHERS = {ojs: [1], omp: [5], ops: [2, 8]};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const item = L.ITEM[app.name];
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps', item: item.id};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    const stored = () => sql(app, `select locale, setting_value from publication_settings where publication_id = (select current_publication_id from submissions where submission_id = ${item.id}) and setting_name = 'abstract'`);
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${L.rel(r.url())}`); });
    try {
        if (nb) {
            for (const id of NB_OTHERS[app.name]) {
                const path = app.name === 'ojs' ? `/index.php/${ctx}/article/view/${id}` : app.name === 'omp' ? `/index.php/${ctx}/catalog/book/${id}` : `/index.php/${ctx}/preprint/view/${id}`;
                await step(`nb other item ${id}`, () => L.readTags(app, page, path));
            }
            await signIn(page, 'dbarnes');
            await L.openWorkflow(app, page, item.id);
            await step('nb save: markup-like text, quotes, two paragraphs', () => L.editAbstract(app, page, NB_TEXT));
            fact('nb stored', stored());
            await signOut(page).catch(() => {});
            await step('nb item page', () => L.readTags(app, page, item.page(ctx)));
            record('nb-item', await screen(page));
        } else {
            // 1
            await step('1 item page, dataset abstract', () => L.readTags(app, page, item.page(ctx)));
            // 2, 3
            await signIn(page, 'dbarnes');
            await L.openWorkflow(app, page, item.id);
            // 4, 5
            await step('4-5 save abstract', () => L.editAbstract(app, page, TEXT));
            record('5-title-abstract', await screen(page));
            fact('5 stored (read for Evidence)', stored());
            // 6
            await step('6 item page', () => L.readTags(app, page, item.page(ctx)));
            record('6-item', await screen(page));
            // 7
            if (app.name === 'omp') {
                const links = await L.bookFileLinks(app, page, item.id);
                fact('7 book file links', links);
                const link = links.find((l) => !l.inChapter);
                if (link) {
                    await step(`7 book file page "${link.text}"`, () => L.readTags(app, page, link.href));
                    record('7-book-file', await screen(page));
                }
            }
        }
        await idle(page).catch(() => {});
        fact('errors', {script: errs, server: fails});
    } finally {
        record(`${nb ? 'nb' : 'steps'}-facts`, facts);
        await close();
    }
});
