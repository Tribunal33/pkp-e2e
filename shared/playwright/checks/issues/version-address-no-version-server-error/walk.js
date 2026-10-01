// Issue report docs/issues/U69-A3-version-address-no-version-server-error.md (U69 A3,
// with U49 OJS3): a book's or an article's version address whose id names none of its
// versions answers a blank server error instead of "404 Not Found". Takes the report's
// Steps on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets").
// The kit builds nothing, and the walk changes nothing.
//
// OMP (press `publicknowledge`, published book 5, its one version 5; book 14's version 14):
//   1. signed out: Catalog, "Bomb Canada and Other Unkind Remarks in the American Media"
//   2. …/catalog/book/5/version/999999
//   3. …/catalog/book/5/version/abc
//   4. …/catalog/book/5/version/14
//   5. signed in as dbarnes: …/catalog/book/5/version/999999
// OJS (published article 17, its one version 18; article 1's version 1), signed out:
//   6. …/article/view/17/version/999999
//   7. …/article/view/17/version/abc
//   8. …/article/view/17/version/1
// OPS is skipped: PreprintHandler's property is untyped, so the same address answers 404
// (read in the code).
//
// WALK=neighbour (fix in and out): the addresses a fix must leave as they are.
//   OMP: book/5 and book/5/version/5 show the book; book/1 (unpublished) sends a visitor to Login.
//   OJS: article/view/17 and …/17/version/18 show the article; …/1/version/2 (an unpublished
//   version) answers "404 Not Found" to a visitor.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/version-address-no-version-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<3.5 feature> PROBE_AGENT=<id> node bin/probe.js all <this file>
const {forEachApp, launch, signIn, signOut, record, idle, sql, note} = require('../../../probe');
const {visit} = require('../earlier-url-path-server-error/lib');
const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');

const MODE = process.env.WALK || 'walk';
const BOOK = 5;
const BOOK_TITLE = 'Bomb Canada and Other Unkind Remarks in the American Media';
const ARTICLE = 17;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name === 'ops') {
        note('version-address walk: ops skipped, PreprintHandler::$publication is untyped');
        return;
    }
    const name = (s) => (MODE === 'walk' ? s : `${MODE}-${s}`);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };
    const log = serverLog(app);
    const ctx = `/index.php/${app.contextPath}/en`;
    const pubs = (id) => sql(app, `select publication_id, status from publications where submission_id = ${id} order by publication_id`).split('\n');
    const {page, close} = await launch(app);
    // visit() reads a book's page; an article's page is told by its own block
    const see = async (label, address) => {
        const out = await visit(page, app, name(label), address);
        out.itemPage = out.bookPage || (await page.locator('.obj_article_details').count()) > 0;
        facts[label] = out;
        return out;
    };

    try {
        if (app.name === 'omp') {
            const book = (rest) => `${ctx}/catalog/book/${rest}`;
            fact('publications of book 5', pubs(BOOK));
            fact('publications of book 14', pubs(14));
            if (MODE === 'neighbour') {
                await see('n1-book', book(BOOK));
                await see('n2-own-version', book(`${BOOK}/version/5`));
                await see('n3-unpublished-book', book(1));
                fact('n server log', log.since());
                return;
            }
            // 1
            await page.goto(app.url(`${ctx}/catalog`));
            await page.getByRole('link', {name: BOOK_TITLE}).first().click();
            await idle(page).catch(() => {});
            fact('1 book page', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title()});
            // 2-4
            await see('2-version-999999', book(`${BOOK}/version/999999`));
            await see('3-version-abc', book(`${BOOK}/version/abc`));
            await see('4-version-other-book', book(`${BOOK}/version/14`));
            // 5
            await signIn(page, 'dbarnes');
            await see('5-version-999999-dbarnes', book(`${BOOK}/version/999999`));
            await signOut(page).catch(() => {});
            fact('server log', log.since());
            return;
        }

        // OJS
        const article = (rest) => `${ctx}/article/view/${rest}`;
        fact('publications of article 17', pubs(ARTICLE));
        fact('publications of article 1', pubs(1));
        if (MODE === 'neighbour') {
            await see('n1-article', article(ARTICLE));
            await see('n2-own-version', article(`${ARTICLE}/version/18`));
            await see('n3-unpublished-version', article('1/version/2'));
            fact('n server log', log.since());
            return;
        }
        // 6-8
        await see('6-version-999999', article(`${ARTICLE}/version/999999`));
        await see('7-version-abc', article(`${ARTICLE}/version/abc`));
        await see('8-version-other-article', article(`${ARTICLE}/version/1`));
        fact('server log', log.since());
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
