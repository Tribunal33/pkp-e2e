// Issue report docs/issues/U10-OMP2-press-category-page-no-page-links.md (U10 OMP2): a press's
// category page holding more books than "Items per page" shows the first page's books and no way to
// the rest. Takes the report's Steps on PKP's default test dataset (a dataset fleet); OMP, with OPS
// as the control (a preprint server's category page prints its page links):
//   1    sign in as dbarnes
//   2    Settings › Website › "Setup" › "Lists": "Items per page" 1, "Save"
//   3-5  open the published item (OMP book 5, OPS preprint 2): "Unpublish"; "Catalog Entry"
//        ("Preprint entry"): "Categories" "Anthr", choose "Social Sciences > Anthropology", "Save";
//        "Publish" ("Post"), confirmed
//   6    the same for the second (OMP book 14, OPS preprint 5)
//   7    log out; the category "Anthropology": count line, books, page links
//   7a   when the page offers a "2" or "Next" link (the fix in, or OPS): follow it and read page 2
//   8    what a visitor has no link to: "?categoryPage=2", and ".../anthropology/2" (3.5's "Next")
//   9    OMP: the catalog, the control ("Next")
// WALK=neighbour runs alone on the state the walk left (run it with the fix in and out, without a
// reset between): as dbarnes, "Items per page" 1 and the catalog; then 2, signed out, the category
// "Anthropology" (both books on one page) and the empty category "Sociology".
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u10l --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u10l PROBE_AGENT=u10l node bin/probe.js omp,ops shared/playwright/checks/issues/press-category-page-no-page-links/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u10l-3_5 PROBE_AGENT=u10l node bin/probe.js omp shared/playwright/checks/issues/press-category-page-no-page-links/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, serverLog} = require('../../../probe');
const L = require('../one-item-reads-1-items/lib.js');
const {setItemsPerPage} = require('../archives-page-past-last-not-404/lib.js');

const MODE = process.env.WALK || 'walk';
const ITEMS = {omp: [5, 14], ops: [2, 5], ojs: []};

/** The paging a visitor is offered under the list: the page-info line and every paging link. */
async function readPaging(page) {
    return page.evaluate(() => {
        const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('.page_catalog_category, .page_catalog, .page') || document.body;
        const links = [...main.querySelectorAll('a')]
            .filter((a) => /categoryPage=|\/category\/[^/?#]+\/\d+|catalog\/page\/\d+|\/catalog\/?\?|cmp_pagination/.test(a.href + ' ' + (a.closest('.cmp_pagination') ? 'cmp_pagination' : '')))
            .map((a) => ({text: t(a), href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}));
        const list = main.querySelector('.cmp_monographs_list, .cmp_article_list, .cmp_preprint_list, ul.articles');
        let after = '';
        if (list) {
            let n = list.nextSibling;
            while (n) {
                after += ' ' + (n.innerText || n.textContent || '');
                n = n.nextSibling;
            }
        }
        return {links, textAfterList: after.replace(/\s+/g, ' ').trim().slice(0, 300)};
    });
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const CAT = L.stepCategory(app);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null, steps: {}};
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
    const read = async (address) => ({...(await L.visit(page, app, address)), paging: await readPaging(page)});
    const catAddress = L.categoryPath(app, CAT.path);
    try {
        if (MODE === 'walk') {
            await step('1 sign in as dbarnes', () => signIn(page, 'dbarnes'));
            await step('2 "Items per page" 1, Save', () => setItemsPerPage(page, app, 1));
            record('pc-s2-lists', await screen(page));
            for (const [i, sid] of ITEMS[app.name].entries()) {
                const n = i === 0 ? '3-5' : '6';
                await step(`${n} open ${sid}`, async () => {
                    await L.openWorkflow(page, app, sid);
                    return {url: L.rel(page.url())};
                });
                await step(`${n} ${sid} unpublish`, async () => ({status: await L.unpublish(page)}));
                await step(`${n} ${sid} the page holding "Categories"`, () => L.editableCategories(page, app, sid));
                await step(`${n} ${sid} Categories: ${CAT.name}, Save`, () => L.placeInCategory(page, CAT));
                await step(`${n} ${sid} publish again`, () => L.publish(page));
            }
            await step('7a log out', () => signOut(page));
            await step(`7 the category "${CAT.name}"`, () => read(catAddress));
            record('pc-s7-category', await screen(page));
            const next = page.locator('.page_catalog_category a').filter({hasText: /^\s*(2|Next|>)\s*$/}).first();
            if (await next.count()) {
                await step('7b follow the page link to page 2', async () => {
                    const text = (await next.innerText()).trim();
                    await next.click();
                    await idle(page).catch(() => null);
                    return {followed: text, url: L.rel(page.url()), ...(await L.readListingPage(page)), paging: await readPaging(page)};
                });
                record('pc-s7b-page2', await screen(page));
            } else {
                fact('7b follow the page link to page 2', 'no "2", "Next" or ">" link on the page');
            }
            await step('8a typed "?categoryPage=2"', () => read(`${catAddress}?categoryPage=2`));
            record('pc-s8a-query', await screen(page));
            await step('8b typed ".../2" (the address 3.5\'s "Next" printed)', () => read(`${catAddress}/2`));
            record('pc-s8b-path', await screen(page));
            if (app.name === 'omp') {
                await step('9 the catalog', () => read(`/index.php/${L.CTX}/catalog`));
                record('pc-s9-catalog', await screen(page));
            }
        } else if (MODE === 'neighbour') {
            await step('n1 sign in as dbarnes', () => signIn(page, 'dbarnes'));
            await step('n2 "Items per page" 1, Save', () => setItemsPerPage(page, app, 1));
            await step('n3 the catalog', () => read(`/index.php/${L.CTX}/catalog`));
            record('pc-n3-catalog', await screen(page));
            await step('n4 "Items per page" 2, Save', () => setItemsPerPage(page, app, 2));
            await step('n5 log out', () => signOut(page));
            await step(`n6 the category "${CAT.name}", both on one page`, () => read(catAddress));
            record('pc-n6-one-page', await screen(page));
            await step('n7 the empty category "Sociology"', () => read(L.categoryPath(app, 'sociology')));
            record('pc-n7-empty', await screen(page));
        }
    } finally {
        fact('server log since start', log.since(from));
        record(`pc-facts-${MODE}`, facts);
        await close();
    }
});
