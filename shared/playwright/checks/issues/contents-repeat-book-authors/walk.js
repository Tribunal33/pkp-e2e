// Issue report docs/issues/U69-A6-contents-repeat-book-authors.md (U69 A6):
// a book page's table of contents repeats the book's author under every
// chapter, where the line is meant to be left out when the chapter's
// authors are the book's. Takes the report's Steps on PKP's default test
// dataset (OMP), signed out:
//   1. the press's catalog, …/catalog
//   2. press "Bomb Canada and Other Unkind Remarks in the American Media"
//      (submission 5: one author, Chantal Allan, who is each chapter's)
//   3. read the table of contents
// Then the control and neighbour check a fix must leave as it is:
//   N1 "From Bricks to Brains: The Embodied Cognitive Science of LEGO
//      Robots" (submission 14: three authors, each chapter by one of them)
//      keeps its author lines.
// On stable-3_5_0 only (main has no such box):
//   L1 rvaca unticks the "Author" role's "Show role title in contributor
//      list" (Settings › Users & Roles › Roles › Author › Edit), and the
//      visitor reads both books again.
// The walk on main changes nothing; reset the dataset fleet before the 3.5
// walk, which changes the role. FIX=1 only tags the records of a run with
// the fix in.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/contents-repeat-book-authors/walk.js
const {forEachApp, launch, signIn, screen, record, idle, sql, note} = require('../../../probe');
const {readBook, setShowRoleTitle} = require('./lib');

const BOOK = 'Bomb Canada and Other Unkind Remarks in the American Media';
const NEIGHBOUR = 14;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`A6 walk: ${app.name} skipped, a table of contents with chapters is a press's`);
        return;
    }
    const stable35 = app.line === 'stable-3_5_0';
    const fix = process.env.FIX ? 'fix-' : '';
    const name = (s) => `${fix}${s}`;
    const facts = {
        app: app.name,
        line: app.line || 'main',
        fix: !!process.env.FIX,
        // What the dataset holds: each chapter's authors beside the book's.
        stored: sql(
            app,
            `select p.submission_id, c.seq,
                (select string_agg(ca.author_id::text, ',' order by ca.seq) from submission_chapter_authors ca where ca.chapter_id = c.chapter_id),
                (select string_agg(a.author_id::text, ',' order by a.seq, a.author_id) from authors a where a.publication_id = p.publication_id)
             from publications p join submission_chapters c using (publication_id)
             where p.submission_id in (5, ${NEIGHBOUR}) order by 1, 2`
        ).split('\n'),
    };
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1800)}`);
    };

    const reader = await launch(app);
    const r = reader.page;
    const readBoth = async (label) => {
        // 1
        await r.goto(app.url(`/index.php/${app.contextPath}/en/catalog`));
        await idle(r);
        record(name(`${label}step1-catalog`), await screen(r));
        // 2
        await Promise.all([r.waitForNavigation(), r.getByRole('link', {name: BOOK, exact: true}).first().click()]);
        await idle(r);
        // 3
        record(name(`${label}step3-book`), await screen(r));
        fact(`${label}3 book`, await readBook(r));
        // N1
        await r.goto(app.url(`/index.php/${app.contextPath}/en/catalog/book/${NEIGHBOUR}`));
        await idle(r);
        record(name(`${label}n1-neighbour-book`), await screen(r));
        fact(`${label}N1 neighbour`, await readBook(r));
    };
    try {
        await readBoth('');
        if (stable35) {
            const manager = await launch(app);
            try {
                await signIn(manager.page, 'rvaca');
                fact('L1 role', await setShowRoleTitle(manager.page, app, 'Author', false));
                record(name('l1-roles'), await screen(manager.page));
                fact('L1 stored', sql(app, `select user_group_id, role_id, show_title from user_groups where user_group_id in (select user_group_id from authors where publication_id in (5, ${NEIGHBOUR}))`));
            } finally {
                await manager.close();
            }
            await readBoth('l1-');
        }
    } finally {
        record(name('facts'), facts);
        await reader.close();
    }
});
