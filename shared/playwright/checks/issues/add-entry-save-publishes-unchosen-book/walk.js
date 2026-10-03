// U70 A8 {OMP}: "Add Entry" › "Save" with a word typed and no book chosen publishes the first
// suggestion; leaving the box with Tab also makes the first suggestion a chosen book.
// The Steps of docs/issues/U70-A8-add-entry-publishes-book-nobody-chose.md, on PKP's default test
// dataset, as `dbarnes`. Spec: docs/specs/U70-catalog-management.md, register A8 (Rule 12a).
// Only OMP has the Catalog page; on OJS and OPS the script does nothing.
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/add-entry-save-publishes-unchosen-book/walk.js
// MODE=neighbour runs the neighbour check alone (what a fix must leave alone): a suggestion clicked,
// then "Save", adds that book only; Enter in the box chooses the first suggestion; a keyword typed
// in Publication › "Metadata" › "Keywords" without Enter, then "Save", is still saved.
// Records the screens; asserts nothing.
const {forEachApp, launch, signIn, record, shot, screen, idle, loc, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const WORD = 'distance';
const AUTHORS = ['dkennepohl@mailinator.com', 'mally@mailinator.com'];

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {CatalogPage} = require('../../../../../apps/omp/playwright/pages/CatalogPages.js');
    const {page, close} = await launch(app);
    const calls = L.watchAddToCatalog(page);
    const facts = {mode: MODE, line: app.line, word: WORD};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1500));
    };
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            await shot(page, `${name}-error`).catch(() => {});
            return {error: L.flat(e.message, 600)};
        }
    };
    try {
        fact('books-before', L.bookStates(app));
        // Steps 1-2.
        await signIn(page, 'dbarnes');
        const catalog = new CatalogPage(page, app.contextPath);
        await catalog.goto();
        fact('list-before', await catalog.shownTitles().allInnerTexts());

        if (MODE === 'walk') {
            const since = new Date();
            // Steps 3-4.
            let panel;
            fact('s4-typed', await step('s4', async () => {
                panel = await catalog.openAddEntry();
                await loc(page, 'Add Entry: the find box', panel.findBox());
                const out = await L.typeAndWait(panel, WORD);
                out.tags = await L.chosenTags(panel);
                record('s4-screen', await screen(page));
                await shot(page, 's4-suggestions');
                return out;
            }));
            // Step 5.
            fact('s5-save', await step('s5', async () => {
                await panel.saveButton().click();
                const out = await L.after(page, panel, catalog);
                out.addToCatalog = calls.slice();
                await shot(page, 's5-after-save');
                return out;
            }));
            fact('s5-books-after', L.bookStates(app));
            fact('s5-mail', await step('s5-mail', async () => {
                await L.sleep(3000);
                const out = {};
                for (const to of AUTHORS) out[to] = await app.mail.count({to, subject: 'Publication Published', since});
                return out;
            }));
            // Steps 6-8.
            fact('s8-tab', await step('s8', async () => {
                if (!(await panel.root().isVisible().catch(() => false))) panel = await catalog.openAddEntry();
                const typed = await L.typeAndWait(panel, WORD);
                const tagsBefore = await L.chosenTags(panel);
                await panel.findBox().press('Tab');
                await L.sleep(800);
                const tagsAfter = await L.chosenTags(panel);
                record('s8-screen', await screen(page));
                await shot(page, 's8-after-tab');
                return {typed, tagsBefore, tagsAfter};
            }));
            fact('calls', calls);
        } else {
            // n1: a suggestion clicked (the second), then "Save": that book alone is added.
            fact('n1-click-then-save', await step('n1', async () => {
                const panel = await catalog.openAddEntry();
                const typed = await L.typeAndWait(panel, WORD);
                const pick = typed.suggestions[1] || typed.suggestions[0];
                await panel.option(pick).click();
                await L.sleep(500);
                const tags = await L.chosenTags(panel);
                await panel.saveButton().click();
                const out = await L.after(page, panel, catalog);
                return {typed, pick, tags, ...out, addToCatalog: calls.slice(), books: L.bookStates(app)};
            }));
            // n2: Enter in the box chooses the first suggestion (the explicit keyboard pick).
            fact('n2-enter', await step('n2', async () => {
                await catalog.goto();
                const panel = await catalog.openAddEntry();
                const typed = await L.typeAndWait(panel, WORD);
                await panel.findBox().press('Enter');
                await L.sleep(800);
                const tags = await L.chosenTags(panel);
                await shot(page, 'n2-after-enter');
                await panel.close().catch(() => {});
                return {typed, tags};
            }));
            // n3: a keyword typed without Enter, then the Metadata form's "Save" (book 1).
            fact('n3-keyword-save', await step('n3', async () => {
                const K = require('../keywords-order-not-kept/lib');
                const input = await K.openMetadata(page, app, 1);
                const before = await K.keywordChips(page);
                await input.click();
                await input.pressSequentially('u70gkw', {delay: 15});
                await L.sleep(800);
                const status = await K.saveForm(page);
                const chipsAfterSave = await K.keywordChips(page);
                const stored = sql(app, "select setting_value from controlled_vocab_entry_settings s join controlled_vocab_entries e on e.controlled_vocab_entry_id = s.controlled_vocab_entry_id where s.setting_value = 'u70gkw'");
                await shot(page, 'n3-after-save');
                return {before, status, chipsAfterSave, stored};
            }));
        }
    } finally {
        record(`a8-${MODE}`, facts);
        await close();
    }
});
