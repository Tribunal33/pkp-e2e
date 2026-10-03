// U70 A9 {OMP}: a book chosen twice in "Add Entry" is published twice: "Save" posts its ID twice,
// and the book's only version reads 2.0, its Activity Log and its author get "published" twice.
// The Steps of docs/issues/U70-A9-add-entry-book-chosen-twice-published-twice.md, on PKP's default
// test dataset, as `dbarnes`. Spec: docs/specs/U70-catalog-management.md, register A9.
// Only OMP has the Catalog page; on OJS and OPS the script does nothing.
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/add-entry-book-chosen-twice-published-twice/walk.js
// MODE=neighbour runs the control alone (what a fix must leave alone): two different books
// chosen ("distance" › book 13, "distance" › book 7) and "Save" publish each once.
// Step 10 reads each book's public page signed out (its "Versions" list).
// Records the screens; asserts nothing.
const {forEachApp, launch, signIn, signOut, record, shot, screen, loc, idle} = require('../../../probe');
const A8 = require('../add-entry-save-publishes-unchosen-book/lib.js');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const BOOK = {id: 7, title: 'Accessible Elements: Teaching Science Online and at a Distance', author: 'dkennepohl@mailinator.com'};
const OTHER = {id: 13, title: 'Mobile Learning: Transforming the Delivery of Education and Training', author: 'mally@mailinator.com'};

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {CatalogPage} = require('../../../../../apps/omp/playwright/pages/CatalogPages.js');
    const {page, close} = await launch(app);
    const calls = A8.watchAddToCatalog(page);
    const facts = {mode: MODE, line: app.line};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1500));
    };
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            await shot(page, `${name}-error`).catch(() => {});
            return {error: A8.flat(e.message, 600)};
        }
    };
    const books = MODE === 'walk' ? [BOOK] : [OTHER, BOOK];
    try {
        for (const b of books) fact(`book${b.id}-before`, L.publications(app, b.id));
        // Steps 1-2.
        await signIn(page, 'dbarnes');
        const catalog = new CatalogPage(page, app.contextPath);
        await catalog.goto();
        fact('list-before', await catalog.shownTitles().allInnerTexts());
        const since = new Date();
        let panel;
        if (MODE === 'walk') {
            // Steps 3-4.
            fact('s4-first-choice', await step('s4', async () => {
                panel = await catalog.openAddEntry();
                await loc(page, 'Add Entry: the find box', panel.findBox());
                return L.chooseIfOffered(panel, 'Accessible', BOOK.title);
            }));
            // Steps 5-6.
            fact('s6-second-choice', await step('s6', async () => {
                const out = await L.chooseIfOffered(panel, 'Accessible', BOOK.title);
                record('s6-screen', await screen(page));
                await shot(page, 's6-after-second-choice');
                return out;
            }));
        } else {
            fact('n1-choices', await step('n1', async () => {
                panel = await catalog.openAddEntry();
                const first = await L.chooseIfOffered(panel, 'distance', OTHER.title);
                const second = await L.chooseIfOffered(panel, 'distance', BOOK.title);
                await shot(page, 'n1-two-books');
                return {first, second};
            }));
        }
        // Step 7.
        fact('s7-save', await step('s7', async () => {
            // Leave the box first with nothing typed, so no suggestion is open when "Save" is pressed (A8).
            await panel.saveButton().click();
            const out = await A8.after(page, panel, catalog);
            out.addToCatalog = calls.slice();
            await shot(page, 's7-after-save');
            return out;
        }));
        // Step 8.
        for (const b of books) {
            fact(`book${b.id}-after`, L.publications(app, b.id));
            fact(`book${b.id}-events`, L.publishEvents(app, b.id));
            fact(`book${b.id}-screens`, await step(`s8-${b.id}`, () => L.workflowReadout(page, app, b.id, `s8-${b.id}`)));
        }
        // Step 9.
        fact('s9-mail', await step('s9', async () => {
            await A8.sleep(4000);
            const out = {};
            for (const b of books) out[b.author] = await app.mail.count({to: b.author, subject: 'Publication Published', since});
            return out;
        }));
        // Step 10: the public book page, signed out, and its "Versions" list.
        for (const b of books) {
            fact(`s10-book${b.id}-public`, await step(`s10-${b.id}`, async () => {
                await signOut(page).catch(() => {});
                await page.goto(app.url(`/index.php/${app.contextPath}/en/catalog/book/${b.id}`));
                await idle(page);
                record(`s10-${b.id}-public`, await screen(page));
                await shot(page, `s10-${b.id}-public`);
                const versions = page.locator('.sub_item.versions');
                return {
                    title: await page.title(),
                    versions: (await versions.count()) ? A8.flat(await versions.first().innerText(), 300) : null,
                };
            }));
        }
    } finally {
        record(`a9-${MODE}`, facts);
        await close();
    }
});
