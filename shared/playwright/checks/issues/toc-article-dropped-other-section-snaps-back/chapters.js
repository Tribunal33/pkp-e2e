// The same fault on OMP's "Chapters" list (U72 A6, joined to the U50 A10 report
// docs/issues/U50-A10-toc-article-dropped-other-section-snaps-back.md): after "Order", a chapter
// dragged above another never moves. Takes the report's "Moving a chapter" Steps on PKP's default
// test dataset (OMP), press `publicknowledge`, submission 17 "Open Development: Networked
// Innovations in International Development":
//   1-2  dbarnes opens the book's "Chapters" (3.5: "Publication" › "Chapters")
//   3-5  "Order", the "Introduction" row dragged above "Preface", "Done"
//   6    reload, "Chapters" again
// Reads the chapter row's classes (the fix restores `category`), the list during the drag, the
// "Done" post and the stored chapter order.
// Neighbour (`neighbour` as the argument; fix in and out): an author dragged within one chapter
// (Ulrike Rivett above Melissa Loudon under "Enacting Openness in ICT4D Research"), "Done",
// reload: the new author order is kept and the chapter order is unchanged.
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --apps omp --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/toc-article-dropped-other-section-snaps-back/chapters.js [neighbour]
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5)
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('../chapter-author-order-change-lost/lib');
const BOOK = 17; // "Open Development: Networked Innovations in International Development"

const NEIGHBOUR = process.argv.includes('neighbour');
const ENACT = 'Enacting Openness in ICT4D Research';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // chapters are a press's
    if (!app.dataset) throw new Error('chapters.js runs on a dataset fleet');
    const facts = {line: app.line || 'main', neighbour: NEIGHBOUR};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        const posts = L.watchSaveSequence(page);
        fact('storedBefore', L.stored(app, BOOK));
        await signIn(page, 'dbarnes');
        let list = await L.openChapters(page, app, BOOK);
        fact('step2-chapters', await L.chapterOrder(list));
        fact('step2-rowClass', (await L.blocks(list)).map((b) => b.chapterRowClass));
        await L.snap(page, 'ch-step2');
        await list.startOrdering();
        fact('step3-rowClass', (await L.blocks(list)).map((b) => b.chapterRowClass));
        if (NEIGHBOUR) {
            fact('n-dragged', await L.dragAuthor(list, ENACT, 'Ulrike Rivett', 'Melissa Loudon'));
            fact('n-done', await L.done(list));
            list = await L.openChapters(page, app, BOOK);
            fact('n-authorsAfterReload', await L.authorOrder(list, ENACT));
            fact('n-chaptersAfterReload', await L.chapterOrder(list));
            await L.snap(page, 'ch-n-reloaded');
        } else {
            // Step 4.
            fact('step4-drag', await L.dragChapterAbove(list, 'Introduction', 'Preface'));
            fact('step4-dropped', await L.blocks(list));
            await L.snap(page, 'ch-step4-dropped');
            // Step 5.
            fact('step5-done', await L.done(list));
            fact('step5-afterDone', await L.chapterOrder(list));
            await L.snap(page, 'ch-step5-done');
            // Step 6.
            list = await L.openChapters(page, app, BOOK);
            fact('step6-afterReload', await L.chapterOrder(list));
            fact('step6-blocks', await L.blocks(list));
            await L.snap(page, 'ch-step6-reloaded');
        }
        fact('posted', posts);
        fact('storedAfter', L.stored(app, BOOK));
    } finally {
        record(NEIGHBOUR ? 'ch-neighbour' : 'ch-facts', facts);
        await close();
    }
});
