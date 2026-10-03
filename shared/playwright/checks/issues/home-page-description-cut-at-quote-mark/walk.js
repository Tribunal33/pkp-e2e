// Issue report docs/issues/U20-A1-home-page-description-cut-at-quote-mark.md (U20 A1): a
// "Description" (Settings › Distribution › "Search Indexing") holding a double quote mark reaches
// the home page's description tag cut at the mark; with markup after the mark, the rest shows as
// text above the home page's header.
// Takes the report's Steps on PKP's default test dataset, all three apps:
//   1. dbarnes signs in
//   2. Settings › Distribution › "Search Indexing" (the dataset's own Description, and the home
//      page's tag before any change, as the control)
//   3. "Description": the last words in double quote marks, "Save"
//   4. the home page's description tag: as sent, as the browser reads it, text above the header
//   5. "Description": the last word in <i> markup as well, "Save"
//   6. the home page again
// NB=1 is the neighbour check for a fix trial, alone: steps 1–2, then markup and "&" without a
// quote mark, which the browser must read as typed with and without the fix.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset 1 --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/home-page-description-cut-at-quote-mark/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib');

const ENDING = 'public access to science.';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${L.rel(r.url())}`); });
    let original = null;
    try {
        // 1
        await signIn(page, 'dbarnes');
        // 2
        await step('2 dataset description', async () => (original = await L.openSearchIndexing(app, page)));
        record('2-search-indexing', await screen(page));
        await step('2 home, dataset text (control)', () => L.readHome(app, page));
        if (!original || !original.endsWith(ENDING)) throw new Error(`the dataset's Description does not end on "${ENDING}": ${original}`);
        const stem = original.slice(0, -ENDING.length);
        if (nb) {
            await L.openSearchIndexing(app, page);
            await step('nb save: markup and & without a quote mark', () => L.saveDescription(app, page, `${stem}public access to <i>science</i> & society.`));
            await step('nb home', () => L.readHome(app, page));
            record('nb-home', await screen(page));
        } else {
            // 3
            await L.openSearchIndexing(app, page);
            await step('3 save: quote marks', () => L.saveDescription(app, page, `${stem}"public access to science".`));
            // 4
            await step('4 home', () => L.readHome(app, page));
            record('4-home', await screen(page));
            // 5
            await L.openSearchIndexing(app, page);
            await step('5 save: quote marks and markup', () => L.saveDescription(app, page, `${stem}"public access to <i>science</i>".`));
            // 6
            await step('6 home', () => L.readHome(app, page));
            record('6-home', await screen(page));
        }
        await idle(page).catch(() => {});
        fact('errors', {script: errs, server: fails});
    } finally {
        record(`${nb ? 'nb' : 'steps'}-facts`, facts);
        await close();
    }
});
