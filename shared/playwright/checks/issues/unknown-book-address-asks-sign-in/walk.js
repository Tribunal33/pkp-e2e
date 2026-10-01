// Issue report docs/issues/U69-A1-unknown-book-address-asks-sign-in.md (U69 A1): on a press,
// a book address that names no book sends a visitor to the Login page and a signed-in user
// to a bare "An invalid published submission was specified." page, instead of "404 Not
// Found". Takes the report's Steps on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"). The kit builds nothing, and the walk changes nothing.
//
// OMP (press `publicknowledge`; no book 999999, no URL Path `no-such-book`):
//   1. signed out: …/catalog/view/999999/1/1
//   2. signed out: …/catalog/book/no-such-book
//   3. signed out: …/catalog/book/999999
//   4. on the Login page step 3 opened: sign in as dbarnes
//   5. signed in: …/catalog/book/no-such-book
// Control, OJS and OPS: …/article/view/999999 and …/preprint/view/999999, signed out and
// as dbarnes.
//
// WALK=neighbour (fix in and out), OMP: what a fix must leave as it is.
//   n1. …/catalog/book/5 (published) shows the book
//   n2. …/catalog/book/1 (unpublished), signed out
//   n3. signed in as dbarnes: …/catalog/book/1 (unpublished; dbarnes is not assigned to it)
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/unknown-book-address-asks-sign-in/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<3.5 feature> PROBE_AGENT=<id> node bin/probe.js all <this file>
const {forEachApp, launch, signIn, signOut, record, sql, idle, screen} = require('../../../probe');
const {visit} = require('../earlier-url-path-server-error/lib');
const {serverLog, flat} = require('../book-without-abstract-oai-lists-fail/lib');

const MODE = process.env.WALK || 'walk';
const NONE = 999999;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const name = (s) => (MODE === 'walk' ? s : `${MODE}-${s}`);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };
    const log = serverLog(app);
    const ctx = `/index.php/${app.contextPath}/en`;
    const {page, close} = await launch(app);
    const see = async (label, address) => {
        const out = await visit(page, app, name(label), address);
        // the page's own block, without the site's header and footer
        out.pageText = flat(await page.locator('.pkp_structure_main').first().innerText({timeout: 2000}).catch(() => null), 300);
        out.h1s = await page.locator('h1').allInnerTexts().catch(() => []);
        out.itemPage = out.bookPage || (await page.locator('.obj_article_details, .obj_preprint_details').count()) > 0;
        facts[label] = out;
        return out;
    };

    try {
        fact('submission 999999', sql(app, `select count(*) from submissions where submission_id = ${NONE}`));
        fact('url path no-such-book', sql(app, `select count(*) from publications where url_path = 'no-such-book'`));
        if (app.name !== 'omp') {
            const item = app.name === 'ojs' ? 'article' : 'preprint';
            if (MODE === 'neighbour') return;
            await see('c1-signed-out', `${ctx}/${item}/view/${NONE}`);
            await signIn(page, 'dbarnes');
            await see('c2-dbarnes', `${ctx}/${item}/view/${NONE}`);
            await signOut(page).catch(() => {});
            fact('server log', log.since());
            return;
        }

        if (MODE === 'neighbour') {
            fact('books 1 and 5', sql(app, 'select submission_id, status from submissions where submission_id in (1, 5) order by 1').split('\n'));
            await see('n1-published-book', `${ctx}/catalog/book/5`);
            await see('n2-unpublished-book', `${ctx}/catalog/book/1`);
            await signIn(page, 'dbarnes');
            await see('n3-unpublished-book-dbarnes', `${ctx}/catalog/book/1`);
            await signOut(page).catch(() => {});
            fact('n server log', log.since());
            return;
        }

        await see('1-file-address', `${ctx}/catalog/view/${NONE}/1/1`);
        await see('2-url-path', `${ctx}/catalog/book/no-such-book`);
        const three = await see('3-number', `${ctx}/catalog/book/${NONE}`);
        // 4: sign in on the Login page step 3 opened (with a fix there is none: the kit signs in)
        if (three.login) {
            const chain = [];
            const onResponse = (r) => {
                if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
            };
            page.on('response', onResponse);
            await page.locator('form#login input#username').fill('dbarnes');
            await page.locator('form#login input#password').fill('dbarnesdbarnes');
            await page.locator('form#login button[type="submit"]').click();
            await page.waitForLoadState('load');
            await idle(page).catch(() => {});
            page.off('response', onResponse);
            const s = await screen(page);
            record(name('4-signed-in-there'), s);
            fact('4-signed-in-there', {
                chain,
                url: page.url().replace(/^https?:\/\/[^/]+/, ''),
                tab: await page.title(),
                h1s: await page.locator('h1').allInnerTexts().catch(() => []),
                pageText: flat(await page.locator('.pkp_structure_main').first().innerText({timeout: 2000}).catch(() => null), 300),
            });
        } else {
            fact('4-signed-in-there', 'step 3 opened no Login page; signed in through the kit');
            await signIn(page, 'dbarnes');
        }
        await see('5-url-path-dbarnes', `${ctx}/catalog/book/no-such-book`);
        await signOut(page).catch(() => {});
        fact('server log', log.since());
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
