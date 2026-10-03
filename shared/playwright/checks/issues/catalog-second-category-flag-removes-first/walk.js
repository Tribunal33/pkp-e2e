// Issue report docs/issues/U70-A4-catalog-second-category-flag-removes-first.md (U70 A4): on a press's
// Catalog page, a book's "Featured in category" ("New release in category", "Featured in series") box
// shown for a second category takes away the book's flag in the first one and stays empty. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), OMP only (the Catalog page is a press's):
//   Categories
//   1    sign in as dbarnes
//   2    submission 5 ("Bomb Canada…"): "Unpublish", confirmed
//   3    "Catalog Entry" › "Categories": "Applied Science", "Social Sciences"; "Save"
//   4    "Publish", confirmed
//   5    Catalog, filter "Applied Science": press "Featured in category" on "Bomb Canada…"
//   6    Catalog, filter "Social Sciences": the box; press it
//   7    the box under "Social Sciences" and "Applied Science", each on the page opened afresh
//   8    "Social Sciences": press the box once more; both categories again
//   9    "New release in category": press under "Applied Science", then under "Social Sciences"; both again
//   Series
//   10   Catalog, filter "Psychology": press "Featured in series" on "From Bricks to Brains" (submission 14)
//   11   submission 14: "Unpublish"; "Catalog Entry" › "Series": "Education", "Save"; "Publish"
//   12   Catalog, filter "Education": the box; press it; once more
// WALK=neighbour runs alone (fix in and out): steps 1-4, then the presses the fix must leave as they
// are: "Featured" with no filter (the whole catalog), then "Featured in category" under "Applied
// Science" pressed on and off again, the whole catalog's box read after each.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u70c --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u70c PROBE_AGENT=u70c node bin/probe.js omp shared/playwright/checks/issues/catalog-second-category-flag-removes-first/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u70c-3_5 PROBE_AGENT=u70c node bin/probe.js omp …/walk.js
const {forEachApp, launch, signIn, screen, record, idle, note, serverLog} = require('../../../probe');
const W = require('../one-item-reads-1-items/lib.js');
const L = require('./lib.js');

const MODE = process.env.WALK || 'walk';
const BOOK = {sid: 5, title: 'Bomb Canada'};
const MOVER = {sid: 14, title: 'From Bricks to Brains'};
const CAT_A = {typed: 'Appl', name: 'Applied Science'};
const CAT_B = {typed: 'Social S', name: 'Social Sciences'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`u70c A4: ${app.name} skipped, the Catalog page is a press's`);
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page).catch(() => null);
    };
    /** The book's boxes on the Catalog page opened afresh with `label` as the filter (null: no filter). */
    const read = async (book, label) => {
        await L.catalogWith(page, app, label);
        return L.boxes(page, book.title);
    };
    const pressIn = async (book, label, which) => {
        await L.catalogWith(page, app, label);
        const before = await L.boxes(page, book.title);
        const pressed = await L.press(page, book.title, which);
        return {before, ...pressed};
    };
    const twoCategories = async () => {
        await step('1 sign in as dbarnes', () => signIn(page, 'dbarnes'));
        await step(`2 submission ${BOOK.sid}: unpublish`, async () => {
            await W.openWorkflow(page, app, BOOK.sid);
            return {status: await W.unpublish(page)};
        });
        await step('3a the page holding "Categories"', () => W.editableCategories(page, app, BOOK.sid));
        await step('3b Categories: Applied Science, Save', () => W.placeInCategory(page, CAT_A));
        await step('3c Categories: Social Sciences, Save', () => W.placeInCategory(page, CAT_B));
        record('a4-s3-categories', await screen(page));
        await step('4 publish', () => W.publish(page));
        fact('4 rows', L.flagRows(app, BOOK.sid));
    };
    try {
        if (MODE === 'walk') {
            await twoCategories();
            await step('5 Applied Science: press Featured', () => pressIn(BOOK, CAT_A.name, 'featured'));
            record('a4-s5-applied', await screen(page));
            fact('5 rows', L.flagRows(app, BOOK.sid));
            await step('6 Social Sciences: press Featured', () => pressIn(BOOK, CAT_B.name, 'featured'));
            record('a4-s6-social', await screen(page));
            fact('6 rows', L.flagRows(app, BOOK.sid));
            await step('7a Social Sciences, reopened', () => read(BOOK, CAT_B.name));
            await step('7b Applied Science, reopened', () => read(BOOK, CAT_A.name));
            record('a4-s7-applied', await screen(page));
            await step('8 Social Sciences: press Featured again', () => pressIn(BOOK, CAT_B.name, 'featured'));
            await step('8b Applied Science, reopened', () => read(BOOK, CAT_A.name));
            fact('8 rows', L.flagRows(app, BOOK.sid));
            await step('9a Applied Science: press New release', () => pressIn(BOOK, CAT_A.name, 'newRelease'));
            await step('9b Social Sciences: press New release', () => pressIn(BOOK, CAT_B.name, 'newRelease'));
            record('a4-s9-social', await screen(page));
            await step('9c Social Sciences, reopened', () => read(BOOK, CAT_B.name));
            await step('9d Applied Science, reopened', () => read(BOOK, CAT_A.name));
            fact('9 rows', L.flagRows(app, BOOK.sid));

            await step('10 Psychology: press Featured', () => pressIn(MOVER, 'Psychology', 'featured'));
            record('a4-s10-psychology', await screen(page));
            fact('10 rows', L.flagRows(app, MOVER.sid));
            await step(`11a submission ${MOVER.sid}: unpublish`, async () => {
                await W.openWorkflow(page, app, MOVER.sid);
                return {status: await W.unpublish(page)};
            });
            await step('11b the "Catalog Entry" page', () => W.editableCategories(page, app, MOVER.sid));
            await step('11c Series: Education, Save', () => L.setSeries(page, 'Education'));
            await step('11d publish', () => W.publish(page));
            fact('11 rows', L.flagRows(app, MOVER.sid));
            await step('12a Education: press Featured', () => pressIn(MOVER, 'Education', 'featured'));
            record('a4-s12-education', await screen(page));
            fact('12a rows', L.flagRows(app, MOVER.sid));
            await step('12b Education, reopened', () => read(MOVER, 'Education'));
            await step('12c Education: press Featured again', () => pressIn(MOVER, 'Education', 'featured'));
            fact('12c rows', L.flagRows(app, MOVER.sid));
        } else if (MODE === 'neighbour') {
            await twoCategories();
            await step('n1 whole catalog: press Featured', () => pressIn(BOOK, null, 'featured'));
            await step('n2 Applied Science: press Featured', () => pressIn(BOOK, CAT_A.name, 'featured'));
            await step('n3 whole catalog, reopened', () => read(BOOK, null));
            await step('n4 Applied Science: press Featured (off)', () => pressIn(BOOK, CAT_A.name, 'featured'));
            await step('n5 whole catalog, reopened', () => read(BOOK, null));
            await step('n6 Applied Science, reopened', () => read(BOOK, CAT_A.name));
            record('a4-n6-applied', await screen(page));
            fact('n rows', L.flagRows(app, BOOK.sid));
        }
    } finally {
        fact('server log since start', log.since(from));
        record(`a4-facts-${MODE}`, facts);
        await close();
    }
});
