// Walk of docs/issues/U41-A3-publication-lists-tick-ignored.md (U41 A3) on PKP's default test
// dataset: one contributor of a published item unticked from "Publication Lists" through the
// workflow (Unpublish first where the item is published, Publish after), then the reader's list
// (the current issue, Catalog, Preprints), the search results and the landing page read.
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/publication-lists-tick-ignored/walk.js
//
// MODE=nb runs the neighbour check alone (for a fix trial): nothing changed, every author line
// of the reader list and of a search read as they arrive, signed out. Records are named
// `a3walk-*` (steps) and `a3nb-*` (neighbour); PROBE_RUN keeps runs apart.
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE === 'nb' ? 'nb' : 'steps';
process.on('unhandledRejection', (e) => console.log(`[warn] unhandled: ${String((e && e.message) || e).split('\n')[0]}`));
const ISSUE = 'Vol. 1 No. 2 (2014)';

forEachApp(async (app) => {
    const P = MODE === 'nb' ? 'a3nb' : 'a3walk';
    const item = L.ITEMS[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        record(`${P}-facts`, facts);
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    try {
        if (MODE === 'nb') {
            fact('nbList', await L.allLines(page, app, item.list.path, `${P}-list`));
            fact('nbSearch', await L.allLines(page, app, 'search/search?query=the', `${P}-search`));
            return;
        }
        // Steps 1-3: dbarnes, the item's workflow (Unpublish where published), "Contributors".
        await signIn(page, 'dbarnes');
        try {
            await L.W.openWorkflow(page, app, item.id);
            if (item.published) fact('unpublish', await L.W.unpublish(page, app));
            const rows = await L.openContributors(page);
            fact('rows', rows);
            // Step 4: the contributor's "Publication Lists" box unticked, "Save".
            fact('untick', await L.untick(page, item.untick));
            // Step 5: "Preview".
            fact('preview', await L.preview(page, P));
            // Step 6: "Publish" ("Post").
            fact('publish', await L.W.publish(page, app, ISSUE, P));
        } catch (e) {
            fact('workflowError', L.flat(e.message, 400));
            await L.snap(page, `${P}-workflow-error`);
        }
        // Steps 7-9: signed out, the reader's list, the search, the landing page.
        await signOut(page);
        const list = await L.readerPage(page, app, item.list.path, item.title, `${P}-list`);
        const search = await L.readerPage(page, app, `search/search?query=${item.word}`, item.title, `${P}-search`);
        const shows = (r) => (r.authors == null ? null : r.authors.includes(item.untick));
        fact('list', {...list, showsUnticked: shows(list)});
        fact('search', {...search, showsUnticked: shows(search)});
        fact('landing', await L.landing(page, app, item, [item.untick], `${P}-landing`));
    } finally {
        await close();
    }
});
