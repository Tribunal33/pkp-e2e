// Issue report docs/issues/U72-A7-chapter-author-order-change-lost.md (U72 A7): a chapter author
// dragged to a new place under "Order" is not saved when their new place in the chapter, counted
// from 1, equals their place on the book's contributor list counted from 0; the list redraws in
// the old order. Takes the report's Steps on PKP's default test dataset (OMP), press
// `publicknowledge`, submission 12 "Connecting ICTs to Development", chapter "Catalyzing Access
// through Social and Technical Innovation" (Frank Tulus, then Raymond Hyma; the book's 3rd and 4th
// contributors):
//   1-2  dbarnes opens the book's "Chapters" (3.5: "Publication" › "Chapters")
//   3-4  "Order", Raymond Hyma dragged above Frank Tulus, "Done"
//   5    reload, "Chapters" again
// Each step reads the list and what the database stores (submission_chapter_authors.seq beside
// the author's place on the contributor list, authors.seq).
// `twice` as the argument: the register's sequence on submission 17 "Open Development: …",
// chapter "Introduction" (Matthew Smith, Katherine Reilly): Reilly dragged up and "Done", then
// Smith dragged back up and "Done", reload: both links end at one stored place.
// `west` as the argument (3.5, whose dataset lists book 12's contributors all at place 0, so the
// Steps hold there): submission 2 "The West and Beyond: …", "Add Chapter" "u72a Chapter" with
// Peter Fortna and Gerald Friesen (the 3rd and 4th contributors) ticked, "Save"; then "Order",
// Gerald Friesen dragged above Peter Fortna, "Done", reload.
// `edit` as the argument: the way round through "Edit Chapter" on the Steps' chapter: the
// title opens "Edit Chapter", "Frank Tulus" unticked, "Save"; the window opened again, "Frank
// Tulus" ticked, "Save"; the list read, then after a reload.
// Neighbour (`neighbour`; fix in and out): on submission 12, Khaled Fourati dragged above John
// Valk under "Catalyzing Access via Telecommunications Policy", "Done", reload: kept, with the
// other chapters' author orders and the book's contributor order unchanged.
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --apps omp --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/chapter-author-order-change-lost/walk.js [twice|neighbour]
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5)
const {forEachApp, launch, signIn, record, sql} = require('../../../probe');
const L = require('./lib');

const MODE = ['neighbour', 'twice', 'west', 'edit'].find((m) => process.argv.includes(m)) || 'steps';
const BOOK = {twice: 17, west: 2}[MODE] || 12;
const WEST = 'u72a Chapter';
const CH1 = 'Catalyzing Access through Social and Technical Innovation';
const CH2 = 'Catalyzing Access via Telecommunications Policy';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // chapters are a press's
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {line: app.line || 'main', mode: MODE, book: BOOK};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const contributors = () =>
        sql(app, `select string_agg(a.author_id::text, ',' order by a.seq, a.author_id) from submissions s join authors a on a.publication_id = s.current_publication_id where s.submission_id = ${BOOK}`);
    const authorsOf = async (list) => (await L.blocks(list)).map((b) => `${b.chapter}: ${b.rows.filter((r) => !r.startsWith('# ')).join(', ')}`);
    const {page, close} = await launch(app);
    try {
        const posts = L.watchSaveSequence(page);
        fact('storedBefore', L.stored(app, BOOK));
        fact('contributorsBefore', contributors());
        // Steps 1-2.
        await signIn(page, 'dbarnes');
        let list = await L.openChapters(page, app, BOOK);
        fact('step2', await authorsOf(list));
        await L.snap(page, `${MODE}-step2-chapters`);
        if (MODE === 'west') {
            await list.addChapter({title: WEST, authors: ['Peter Fortna', 'Gerald Friesen']});
            await L.sleep(800);
            fact('w-added', await authorsOf(list));
            fact('w-storedAdded', L.stored(app, BOOK));
        }
        if (MODE === 'edit') {
            const editOnce = async (tick, label) => {
                const win = await list.openEdit(CH1);
                fact(`e-${label}-boxesBefore`, await win.boxStates('contributors'));
                const box = win.contributorBox('Frank Tulus');
                if (tick) await box.check();
                else await box.uncheck();
                await win.save();
                await L.sleep(800);
                fact(`e-${label}-after`, await authorsOf(list));
                fact(`e-${label}-stored`, L.stored(app, BOOK));
                await L.snap(page, `edit-${label}`);
            };
            await editOnce(false, 'untick');
            await editOnce(true, 'tick');
        } else {
            await list.startOrdering();
        }
        if (MODE === 'edit') {
            // nothing more before the reload
        } else if (MODE === 'steps') {
            // Steps 3-4.
            fact('step3-dragged', await L.dragAuthor(list, CH1, 'Raymond Hyma', 'Frank Tulus'));
            await L.snap(page, 'steps-step3-dragged');
            fact('step4-done', await L.done(list));
            fact('step4-afterDone', await authorsOf(list));
            await L.snap(page, 'steps-step4-done');
        } else if (MODE === 'west') {
            fact('w-dragged', await L.dragAuthor(list, WEST, 'Gerald Friesen', 'Peter Fortna'));
            fact('w-done', await L.done(list));
            fact('w-afterDone', await authorsOf(list));
            await L.snap(page, 'west-done');
        } else if (MODE === 'neighbour') {
            fact('n-dragged', await L.dragAuthor(list, CH2, 'Khaled Fourati', 'John Valk'));
            fact('n-done', await L.done(list));
            fact('n-afterDone', await authorsOf(list));
            await L.snap(page, 'neighbour-done');
        } else {
            fact('t-dragged1', await L.dragAuthor(list, 'Introduction', 'Katherine Reilly', 'Matthew Smith'));
            fact('t-done1', await L.done(list));
            fact('t-afterDone1', await authorsOf(list));
            fact('t-stored1', L.stored(app, BOOK));
            await list.startOrdering();
            fact('t-dragged2', await L.dragAuthor(list, 'Introduction', 'Matthew Smith', 'Katherine Reilly'));
            fact('t-done2', await L.done(list));
            fact('t-afterDone2', await authorsOf(list));
            await L.snap(page, 'twice-done2');
        }
        fact('storedAfterDone', L.stored(app, BOOK));
        // Step 5.
        list = await L.openChapters(page, app, BOOK);
        fact('step5-afterReload', await authorsOf(list));
        await L.snap(page, `${MODE}-step5-reloaded`);
        fact('contributorsAfter', contributors());
        fact('posted', posts);
    } finally {
        record(`${MODE}-facts`, facts);
        await close();
    }
});
