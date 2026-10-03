// U70 A5 {OMP}: "Add Entry" › "Save" refused (nothing chosen; a book whose contributor's ORCID iD
// is unverified while ORCID is on) shows only "Please correct these errors", and nothing in the
// panel says what is wrong.
// The Steps of docs/issues/U70-A5-add-entry-refusal-no-reason.md, on PKP's default test dataset,
// as `dbarnes`. Spec: docs/specs/U70-catalog-management.md, register A5.
// Only OMP has the Catalog page; on OJS and OPS the script does nothing.
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/add-entry-refusal-no-reason/walk.js
// MODE=neighbour runs the controls a fix must leave alone, alone: a field the server refuses on
// the Catalog Entry page ("URL Path" "my book") is still marked at its box, and "Add Entry" with a
// book chosen (book 13) still publishes it and closes the panel. MODE=recover (with the fix in):
// after the empty "Save" is refused, choosing book 13 clears the refusal and "Save" adds it.
// Records the screens; asserts nothing.
const {forEachApp, launch, signIn, record, shot, screen, loc, idle} = require('../../../probe');
const A8 = require('../add-entry-save-publishes-unchosen-book/lib.js');
const U49 = require('../publish-without-issue-orcid-contributor-error/lib.js');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const BOOK = {id: 7, title: 'Accessible Elements: Teaching Science Online and at a Distance', author: 'dkennepohl@mailinator.com'};
const OTHER = {id: 13, title: 'Mobile Learning: Transforming the Delivery of Education and Training'};

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {CatalogPage, CatalogEntryPage} = require('../../../../../apps/omp/playwright/pages/CatalogPages.js');
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
    try {
        await signIn(page, 'dbarnes');
        const catalog = new CatalogPage(page, app.contextPath);
        if (MODE === 'walk') {
            // Nothing chosen: steps 1-4.
            await catalog.goto();
            let panel;
            fact('s4-empty-save', await step('s4', async () => {
                panel = await catalog.openAddEntry();
                await loc(page, 'Add Entry: the find box', panel.findBox());
                await panel.saveButton().click();
                const out = await L.panelState(page, panel);
                out.addToCatalog = calls.slice();
                await shot(page, 's4-after-save');
                return out;
            }));
            // Preconditions of the second group: ORCID on (screen), book 7's iD unverified (ORCID's state, SQL).
            fact('p-orcid-settings', await step('p-orcid', async () => {
                const out = await U49.setOrcidMember(page, app);
                delete out.screen;
                return out;
            }));
            fact('p-orcid-seed', L.seedUnverifiedOrcid(app, BOOK.id, BOOK.author));
            // Steps 5-7.
            await catalog.goto();
            fact('s7-refused-book', await step('s7', async () => {
                panel = await catalog.openAddEntry();
                const typed = await A8.typeAndWait(panel, 'Accessible');
                await panel.option(BOOK.title).click();
                await A8.sleep(800);
                const tagsBefore = await A8.chosenTags(panel);
                const n = calls.length;
                await panel.saveButton().click();
                const out = await L.panelState(page, panel);
                out.suggested = typed.suggestions;
                out.tagsBefore = tagsBefore;
                out.addToCatalog = calls.slice(n);
                out.book = L.currentVersion(app, BOOK.id);
                await shot(page, 's7-after-save');
                return out;
            }));
            // Step 8: the control.
            fact('s8-workflow-publish', await step('s8', () => L.workflowPublishWindow(page, app, BOOK.id, 's8-schedule-window')));
        } else if (MODE === 'recover') {
            // r1: after the empty "Save" is refused, choosing a book clears the refusal and "Save" adds it.
            await catalog.goto();
            fact('r1-recover', await step('r1', async () => {
                const panel = await catalog.openAddEntry();
                await panel.saveButton().click();
                const refused = await L.panelState(page, panel);
                await A8.typeAndWait(panel, 'Mobile');
                await panel.option(OTHER.title).click();
                await A8.sleep(800);
                const chosen = await L.panelState(page, panel);
                const n = calls.length;
                await panel.saveButton().click();
                const saved = await L.panelState(page, panel);
                saved.addToCatalog = calls.slice(n);
                saved.book = L.currentVersion(app, OTHER.id);
                await shot(page, 'r1-after-save');
                return {refused, chosen, saved};
            }));
        } else {
            // n1: a field-keyed refusal on the Catalog Entry page stays marked at its box.
            fact('n1-url-path', await step('n1', async () => {
                const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
                await new WorkflowPage(page, app.contextPath).gotoEditorial(BOOK.id);
                await idle(page);
                const entry = new CatalogEntryPage(page, app.contextPath);
                await entry.openFromWorkflow();
                await entry.urlPathBox().fill('my book');
                const {response} = await entry.save();
                await A8.sleep(1200);
                const s = await screen(page);
                await shot(page, 'n1-url-path');
                return {
                    status: response.status(),
                    notices: s.notices,
                    fieldErrors: (await entry.form().locator('.pkpFieldError').allInnerTexts()).map((t) => A8.flat(t, 200)).filter(Boolean),
                    footer: (await entry.form().locator('.pkpFormErrors').allInnerTexts()).map((t) => A8.flat(t, 200)),
                };
            }));
            // n2: "Add Entry" with a book chosen publishes it and closes the panel.
            await catalog.goto();
            fact('n2-good-save', await step('n2', async () => {
                const panel = await catalog.openAddEntry();
                await A8.typeAndWait(panel, 'Mobile');
                await panel.option(OTHER.title).click();
                await A8.sleep(800);
                const n = calls.length;
                await panel.saveButton().click();
                const out = await L.panelState(page, panel);
                out.addToCatalog = calls.slice(n);
                out.book = L.currentVersion(app, OTHER.id);
                out.listTitles = await catalog.shownTitles().allInnerTexts().catch(() => null);
                await shot(page, 'n2-after-save');
                return out;
            }));
        }
    } finally {
        record(`a5-${MODE}`, facts);
        await close();
    }
});
