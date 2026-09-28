// @ts-check
/**
 * @file playwright/tests/U74-onix-metadata-export.spec.js
 *
 * U74 — ONIX metadata & export, OMP suite: one test per canonical scenario
 * the spec runs on a press, S2–S8 here (the feature is {OMP}, so every
 * scenario of its own runs here), plus S9's press side (its control: the
 * seeded press's book offers the "Marketing" group, the format window's
 * "Metadata" tab with "Sales Rights" and "Market Territories", and the
 * Tools list's "ONIX 3.0 Monograph Export Plugin"; the journal's and the
 * preprint server's absence run in their own suites, since CI installs
 * one app per job). S1 lives in
 * `tests/serial/U74-onix-metadata-export.spec.js`: its mailbox is read
 * after the job queue has run (footnote s), and only the serial project
 * drains the shared queue (patterns.md, parallel lesson 7).
 * Spec: docs/specs/U74-onix-metadata-export.md
 *
 * Deliberately NOT covered, by register ID (the spec's Coverage section is
 * the record of everything else left out; a 🐞 is never asserted as the
 * contract, a ❓ is not a gap):
 * - A1 🐞: S6 reads that "Export Submissions Results" opens, not what it says.
 * - A4 🐞: S4 finds its market by the "Representatives" cell and never reads
 *   "Territory" or "Price".
 * - A5 🐞: S4 reads no "Date Format" on arrival.
 * - A6 🐞: S4 and S5 never read "Taxation Type" in a market's "Edit".
 * - A9 🐞: S7's audience is "General / adult (01)", whose code equals the
 *   value "01" either way round.
 * - A11 🐞: S8's import carries no "Rest of World?" entry.
 * - A12 🐞: S2 reads neither role list on arrival, and adds its supplier
 *   with "Agent" clicked before "Supplier" (scenarios.md, the parity fact).
 * - A13 🐞: S2 reads the moved representative only after a reload.
 * - A14 🐞: S2 accepts the refused delete's pop-up and presses the
 *   dialog's "Cancel" if it is still open, reading neither.
 * - A15 🐞: S3 reads no message for the second "Rest of World?" entry.
 * - A16 🐞: no test presses "Export Submissions" with nothing ticked.
 * - A19 🐞: S8 reads "Supplier Sam" among the imported suppliers, not the
 *   suppliers' count.
 * - A2, A3, A7, A8, A10, A17, A18: no scenario reaches those states.
 *
 * Seeding: scenario endpoints only; the seeded press and roster are
 * read-only (PRINCIPLES A1, A7). Every book is a scratch submission from
 * `scenarios/submission` with its press's Author as submitter (footnote
 * s); the trade data seeds through `audience`, `representatives[]` and
 * the formats' `salesRights[]` and `markets[]`, a territory being the
 * entry's own `countriesIncluded` and siblings (scenarios.md). S3, S4 and
 * S5 read the lists' notices ("Sales Rights added.", "Market added.",
 * …): a notice is queued per user on the server and drained by any page
 * load of that user, so a roster account's notice can be taken, or shown,
 * by a parallel test (patterns.md, parallel lesson 2); those scenarios
 * run on a scratch press with a throwaway Press manager and a throwaway
 * Author, the given's roles unchanged, as S2, S6, S7 and S8 do by their
 * givens. S9's control runs on `publicknowledge` as `manager.maya`, and
 * reads no notice. Browser dialogs go through `watchDialogs` (a refused
 * representative delete's alert() is accepted; a window's "form has
 * changed" confirm() takes the answer the test queues; a page-leave
 * question is accepted). A Native XML file is read with the browser's
 * XML parser (`onixProducts`). Tags are unique per run (M5); waits are
 * web-first (A5). Everything here runs in the parallel `omp` project.
 */
const fs = require('fs');
const {test, expect} = require('../support/fixtures.js');
const {
    LISTS,
    exactly,
    watchDialogs,
    expectNotice,
    PublicationFormatsPage,
} = require('../pages/PublicationFormatPages.js');
const {createNewVersion} = require('../pages/PublicationPages.js');
const {
    TEXT,
    AUDIENCE,
    AGENT_ROLES,
    optionTexts,
    chosenTexts,
    rowCells,
    AudiencePage,
    RepresentativesPage,
    RepresentativeWindow,
    SalesRightsWindow,
    MarketWindow,
    ListRows,
    openAddSalesRights,
    openAddMarket,
    OnixToolPage,
    onixProducts,
    descendants,
    texts,
    children,
} = require('../pages/OnixPages.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ToolsPage, NativeXmlPage, resultLines} = require('../../../../shared/playwright/pages/ImportExportPages.js');
const {SettingsPages, SettingsForm} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');

const PRESS = 'publicknowledge';
const MANAGER = 'manager.maya';
const AUTHOR = 'author.alex';

const PRODUCTION = {submitted: true, decisions: ['skipExternalReview', 'sendToProduction']};
const NATIVE = {exportTab: 'Export', exportButton: 'Export Submissions', importResults: 'Results'};

const TYPE_01 = 'For sale with exclusive rights in the specified countries or territories (01)';
const DISTRIBUTOR = 'Distributor to end-customers (12)';
const ONIX_DETAILS = {publisher: 'Tidewater Press', location: 'Halifax', codeType: 'Proprietary (01)', codeValue: 'TWP-01'};

const ADA = {type: 'agent', role: 'Exclusive sales agent (05)', name: 'Agent Ada'};
const BERT = {type: 'agent', role: 'Local publisher (07)', name: 'Agent Bert'};
const SAM = {type: 'supplier', role: DISTRIBUTOR, name: 'Supplier Sam'};

/** Unique per-run tag: one alphanumeric token, scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u74${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * A scratch press with a throwaway Press manager and a throwaway Author;
 * its "Masthead" complete (`acronym`, `country`); `keys` are extra
 * context keys (the ONIX details).
 */
async function scratchPress(ompApi, tag, keys = {}, extraUsers = []) {
    const mg = {username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', email: `${tag}mg@mail.test`, roles: ['manager']};
    const au = {username: `${tag}au`, givenName: 'Ava', familyName: 'Author', email: `${tag}au@mail.test`, roles: ['author']};
    await ompApi.createContext({
        tag,
        context: {name: `Press ${tag}`, acronym: 'TWP', country: 'CA'},
        users: [mg, au, ...extraUsers],
        ...keys,
    });
    return {path: tag, mg, au};
}

/** A scratch book in Production; `context` defaults to the seeded press, `submitter` to its Author. */
async function seedBook(ompApi, tag, {context = PRESS, submitter = AUTHOR, title = `Book ${tag}`, ...rest} = {}) {
    return ompApi.createSubmission({tag, context, submitter, title, ...PRODUCTION, ...rest});
}

/** A page as `username`, its browser dialogs answered by `watchDialogs`. */
async function pageAs(asUser, username) {
    const page = await (await asUser(username)).newPage();
    return {page, ...watchDialogs(page)};
}

/** Open "Paperback"'s "Edit" › "Metadata" on the open Publication Formats page. */
async function openPaperbackMetadata(pf, name = 'Paperback') {
    const win = await pf.openEdit(name);
    const meta = await win.openMetadata();
    return {win, meta};
}

/**
 * Export a book on a press's Native XML tool and download the file
 * (Import & export, its Rule 16); returns the file's text.
 */
async function nativeExport(page, pressPath, title) {
    const native = new NativeXmlPage(page, pressPath, NATIVE);
    await native.goto();
    await native.openExportTab();
    await native.list.box(title).check();
    const results = await native.list.pressExport(native);
    await expect(results).toContainText('The export completed successfully.', {timeout: 30_000});
    const file = await native.download(results);
    expect(file.name).toMatch(/\.xml$/);
    return file.text;
}

/** Empty the Masthead's "Publisher Code" and save (Settings bullet 1). */
async function emptyPublisherCode(page, pressPath) {
    const settings = new SettingsPages(page, pressPath);
    await settings.openJournalTab('Masthead');
    const form = new SettingsForm(page, '[name="publisher"]');
    await form.ready();
    await form.form.locator('[name="codeValue"]').fill('');
    await form.save();
}

test.describe('ONIX metadata & export (U74)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test("S2: A book's representatives", async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s2', testInfo);
        const mk = {username: `${tag}mk`, givenName: 'Mia', familyName: 'Marketing', email: `${tag}mk@mail.test`, roles: ['marketing']};
        const press = await scratchPress(ompApi, tag, {}, [mk]);
        // Given: Supplier Sam alone, named by a market of "Paperback"; the
        // coordinator assigned to the book (footnote s).
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            participants: [{username: mk.username, role: 'marketing'}],
            representatives: [SAM],
            publicationFormats: [
                {name: 'Paperback', markets: [{date: '20260915', price: '25', supplier: 'Supplier Sam', countriesIncluded: ['Canada (CA)']}]},
            ],
        });
        const {page, seen, answers} = await pageAs(asUser, press.mg.username);
        const rp = new RepresentativesPage(page, press.path, {appContext});
        await rp.frame.gotoEditorial(book.submissionId);

        // The page (Fields, the "Representatives" page).
        await rp.openFromMenu();
        await expect(rp.addLink()).toBeVisible();
        await expect(rp.columnHeads()).toHaveText([exactly('Name'), exactly('Role')]);
        await expect(rp.groupEmpty('Agents')).toHaveText(exactly('No Items'));
        await expect(rp.rows('Agents')).toHaveCount(0);
        await expect(rp.names('Suppliers')).toHaveText([exactly('Supplier Sam')]);
        await rp.expectListed('Suppliers', 'Supplier Sam', DISTRIBUTOR);

        // The window (Fields, the representative window); both "Role"
        // lists on arrival are A12, not read.
        let win = await rp.openAdd();
        await expect(win.title()).toHaveText(exactly('Add Representative'));
        await expect(win.typeRadio('supplier')).toBeChecked();
        await expect(win.typeRadio('agent')).not.toBeChecked();
        expect(await win.labels()).toEqual([
            'Representative Type',
            'Agent',
            'Supplier',
            'Role',
            'Name',
            'Representative ID Type (GLN is recommended)',
            'Representative ID',
            'Phone',
            'Email Address',
            'Website',
        ]);
        await expect(win.idTypeList().locator('option:checked')).toHaveText(exactly('GLN (06)'));
        for (const box of [win.nameBox(), win.idValueBox(), win.phoneBox(), win.emailBox(), win.websiteBox()]) {
            await expect(box).toBeVisible();
        }
        await expect(win.requiredNote()).toBeVisible();
        await expect(win.cancelLink()).toBeVisible();
        await expect(win.okButton()).toBeVisible();

        // What the window refuses (Rules 6, 7): no request is sent.
        const saves = [];
        page.on('request', (r) => {
            if (/update-representative/.test(r.url())) saves.push(r.url());
        });
        await win.chooseType('agent');
        await expect(win.roleList('agent')).toBeVisible();
        await expect(win.roleList('supplier')).toBeHidden();
        expect(await win.roleOptions('agent')).toEqual(['', ...AGENT_ROLES]);
        await win.okButton().click();
        await expect(await win.errorUnder(win.nameBox())).toHaveText(TEXT.required, {timeout: 30_000});
        await expect(await win.errorUnder(win.roleList('agent'))).toHaveText(TEXT.required);
        await win.nameBox().fill('Agent Ada');
        await win.roleList('agent').selectOption({label: 'Exclusive sales agent (05)'});
        await win.emailBox().fill('not-an-email');
        await win.okButton().click();
        await expect(await win.errorUnder(win.emailBox())).toHaveText(TEXT.emailRefused, {timeout: 30_000});
        await win.emailBox().fill('ada@example.org');
        await win.websiteBox().fill('www.example.org');
        await win.okButton().click();
        await expect(await win.errorUnder(win.websiteBox())).toHaveText(TEXT.urlRefused, {timeout: 30_000});
        await expect(win.dialog()).toHaveCount(1);
        expect(saves, 'the refused presses send nothing').toEqual([]);
        await expect(rp.rows('Agents')).toHaveCount(0);

        // An agent added (Rule 5).
        await win.websiteBox().fill('https://ada.example.org');
        await expectNotice(page, TEXT.repAdded, () => win.ok());
        await rp.expectListed('Agents', 'Agent Ada', 'Exclusive sales agent (05)');

        // The type decides the role (Rules 5, 6).
        win = await rp.openAdd();
        await win.nameBox().fill('Beta Books');
        await win.chooseType('agent');
        await win.roleList('agent').selectOption({label: 'Sales agent (08)'});
        await win.chooseType('supplier');
        await expect(win.roleList('supplier')).toBeVisible();
        await expect(win.roleList('agent')).toBeHidden();
        expect((await win.roleOptions('supplier')).slice(0, 2)).toEqual(['', DISTRIBUTOR]);
        await win.roleList('supplier').selectOption({label: DISTRIBUTOR});
        await win.chooseType('agent');
        await expect(win.roleList('agent').locator('option:checked')).toHaveText(exactly('Sales agent (08)'));
        await win.chooseType('supplier');
        await expectNotice(page, TEXT.repAdded, () => win.ok());
        await rp.expectListed('Suppliers', 'Beta Books', DISTRIBUTOR);

        // Moved to the other group (Rule 6); what the table shows before
        // the reload is A13, not read.
        win = await rp.openEdit('Suppliers', 'Beta Books');
        await expect(win.title()).toHaveText(exactly('Edit'));
        await win.chooseType('agent');
        await win.roleList('agent').selectOption({label: 'Non-exclusive sales agent (06)'});
        await expectNotice(page, TEXT.repEdited, () => win.ok());
        await rp.reload();
        await rp.expectListed('Agents', 'Beta Books', 'Non-exclusive sales agent (06)');
        await expect(rp.row('Suppliers', 'Beta Books')).toHaveCount(0);
        await expect(rp.names('Suppliers')).toHaveText([exactly('Supplier Sam')]);

        // Deleted (Rule 8a).
        let del = await rp.openDelete('Agents', 'Beta Books');
        await expect(del.question()).toBeVisible();
        await expect(del.buttons()).toHaveText([exactly('OK'), exactly('Cancel')]);
        await del.cancel();
        await expect(rp.row('Agents', 'Beta Books')).toHaveCount(1);
        del = await rp.openDelete('Agents', 'Beta Books');
        await expectNotice(page, TEXT.repRemoved, () => del.ok());
        await expect(rp.row('Agents', 'Beta Books')).toHaveCount(0, {timeout: 30_000});
        await expect(rp.names('Agents')).toHaveText([exactly('Agent Ada')]);

        // Kept while a market names it (Rule 8b): the pop-up accepted; what
        // the dialog then does is A14, its "Cancel" pressed if still open.
        del = await rp.openDelete('Suppliers', 'Supplier Sam');
        const asked = seen.length;
        answers.push('accept');
        await del.dialog().getByRole('button', {name: 'OK', exact: true}).click();
        await expect.poll(() => seen.length, {timeout: 30_000}).toBe(asked + 1);
        expect(seen[asked]).toEqual({type: 'alert', message: TEXT.repInUse});
        if (await del.dialog().isVisible()) {
            await del.cancel();
        }
        await rp.expectListed('Suppliers', 'Supplier Sam', DISTRIBUTOR);

        // The Marketing and sales coordinator (Actors rows 1, 3; Rules 5, 8a).
        const coordinator = await pageAs(asUser, mk.username);
        const mrp = new RepresentativesPage(coordinator.page, press.path, {appContext});
        await mrp.frame.gotoEditorial(book.submissionId);
        await mrp.openFromMenu();
        await expect(mrp.addLink()).toBeVisible();
        await expect(mrp.names('Agents')).toHaveText([exactly('Agent Ada')]);
        await expect(mrp.names('Suppliers')).toHaveText([exactly('Supplier Sam')]);
        let mwin = await mrp.openAdd();
        await mwin.chooseType('agent');
        await mwin.roleList('agent').selectOption({label: 'Local publisher (07)'});
        await mwin.nameBox().fill('Delta Agency');
        await expectNotice(coordinator.page, TEXT.repAdded, () => mwin.ok());
        await mrp.expectListed('Agents', 'Delta Agency', 'Local publisher (07)');
        mwin = await mrp.openEdit('Agents', 'Delta Agency');
        await expectNotice(coordinator.page, TEXT.repEdited, () => mwin.ok());
        const mdel = await mrp.openDelete('Agents', 'Delta Agency');
        await expectNotice(coordinator.page, TEXT.repRemoved, () => mdel.ok());
        await expect(mrp.row('Agents', 'Delta Agency')).toHaveCount(0, {timeout: 30_000});

        // Control: "Paperback"'s "Add Market" offers the book's
        // representatives (Rule 14).
        const pf = new PublicationFormatsPage(page, press.path, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);
        const {meta} = await openPaperbackMetadata(pf);
        const market = await openAddMarket(meta);
        expect(await optionTexts(market.agentList())).toEqual(['', 'Agent Ada']);
        expect(await optionTexts(market.supplierList())).toEqual(['', 'Supplier Sam']);
        await market.cancel();
    });

    test("S3: A format's sales rights", async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s3', testInfo);
        const press = await scratchPress(ompApi, tag);
        // Given: "Paperback", with no sales rights and no market (footnote s).
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            publicationFormats: [{name: 'Paperback'}],
        });
        const {page, seen} = await pageAs(asUser, press.mg.username);
        const pf = new PublicationFormatsPage(page, press.path, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);

        // The two lists (Fields, the "Sales Rights" and "Market Territories" lists).
        let {win, meta} = await openPaperbackMetadata(pf);
        await expect(meta.listHeading(LISTS.salesRights)).toHaveText(exactly('Sales Rights'));
        await expect(meta.listAddLink(LISTS.salesRights, 'Add Sales Rights')).toBeVisible();
        await expect(meta.listColumns(LISTS.salesRights)).toHaveText([exactly('Sales Rights Type'), exactly('Rest of World?')]);
        await expect(meta.listEmpty(LISTS.salesRights)).toHaveText(exactly('No Items'));
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(0);
        await expect(meta.listHeading(LISTS.markets)).toHaveText(exactly('Market Territories'));
        await expect(meta.listAddLink(LISTS.markets, 'Add Market')).toBeVisible();
        await expect(meta.listColumns(LISTS.markets)).toHaveText([exactly('Territory'), exactly('Representatives'), exactly('Price')]);
        await expect(meta.listEmpty(LISTS.markets)).toHaveText(exactly('No Items'));
        await expect(meta.listRows(LISTS.markets)).toHaveCount(0);
        expect(
            await meta.form().evaluate((form) => {
                const heads = [...form.querySelectorAll('.header h4')].map((h) => (h.textContent || '').trim());
                return heads.indexOf('Sales Rights') < heads.indexOf('Market Territories');
            }),
            '"Market Territories" under "Sales Rights"'
        ).toBe(true);

        // The window (Fields, the sales-rights window).
        let rights = await openAddSalesRights(meta);
        await expect(rights.title()).toHaveText(exactly('Add Sales Rights'));
        await expect(rights.chosenType()).toHaveText(exactly(TYPE_01));
        await expect(rights.rowBox()).not.toBeChecked();
        expect(await rights.labels()).toEqual([
            'Sales Rights Type',
            TEXT.rowHelp,
            'Rest of World?',
            'Countries',
            'Included',
            'Excluded',
            'Regions',
            'Included',
            'Excluded',
        ]);
        for (const which of ['countries', 'regions']) {
            for (const side of ['Included', 'Excluded']) {
                await expect(rights.territoryList(which, side)).toBeVisible();
            }
        }
        await expect(rights.cancelLink()).toBeVisible();
        await expect(rights.okButton()).toBeVisible();

        // A "Rest of World?" entry (Rules 9, 11).
        await rights.rowBox().check();
        await expectNotice(page, TEXT.rightsAdded, () => rights.ok());
        const rowEntry = ListRows.rightsRow(meta, TYPE_01);
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(1, {timeout: 30_000});
        await expect(rowEntry).toHaveCount(1);
        await expect(ListRows.rowTick(rowEntry)).toHaveCount(1);

        // Each type once (Rules 9, 10).
        rights = await openAddSalesRights(meta);
        const offered = await rights.typeOptions();
        expect(offered).not.toContain(TYPE_01);
        const second = offered[0];
        await expect(rights.chosenType()).toHaveText(exactly(second));
        await rights.territoryList('countries', 'Included').selectOption([{label: 'Canada (CA)'}, {label: 'United States (US)'}]);
        await rights.territoryList('countries', 'Excluded').selectOption([{label: 'United Kingdom (GB)'}]);
        await expectNotice(page, TEXT.rightsAdded, () => rights.ok());
        const secondRow = ListRows.rightsRow(meta, second);
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(2, {timeout: 30_000});
        await expect(secondRow).toHaveCount(1);
        await expect(ListRows.rowTick(secondRow)).toHaveCount(0);
        await expect(ListRows.rowTick(rowEntry)).toHaveCount(1);

        // A second "Rest of World?" refused (Rule 11): the window stays,
        // nothing saved; its silence is A15, not read. "Cancel" closes at
        // once without asking (Fields, "Leaving a window").
        rights = await openAddSalesRights(meta);
        await rights.rowBox().check();
        await rights.okRefusedByServer();
        await expect(rights.dialog()).toHaveCount(1);
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(2);
        const asked = seen.length;
        await rights.cancel();
        expect(seen.length, '"Cancel" asks nothing').toBe(asked);
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(2);
        await expect(meta.listRows(LISTS.salesRights).locator('.checked')).toHaveCount(1);

        // Edited (Rules 9, 10).
        rights = await ListRows.openEdit(page, secondRow, SalesRightsWindow);
        await expect(rights.title()).toHaveText(exactly('Edit'));
        await expect(rights.chosenType()).toHaveText(exactly(second));
        await expectNotice(page, TEXT.rightsEdited, () => rights.ok());
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(2, {timeout: 30_000});

        // Deleted, and its type offered again (Rules 9, 10).
        let del = await ListRows.openDelete(page, secondRow);
        await expect(del.question()).toBeVisible();
        await del.cancel();
        await expect(secondRow).toHaveCount(1);
        del = await ListRows.openDelete(page, secondRow);
        await expectNotice(page, TEXT.rightsRemoved, () => del.ok());
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(1, {timeout: 30_000});
        await expect(rowEntry).toHaveCount(1);
        rights = await openAddSalesRights(meta);
        await expect(rights.chosenType()).toHaveText(exactly(second));
        await rights.cancel();

        // Control: the tab's own "Cancel", then the tab again: the "Rest of
        // World?" row kept without the tab's "Save" (Rule 9).
        await meta.cancelLink().click();
        await win.expectClosed();
        ({win, meta} = await openPaperbackMetadata(pf));
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(1);
        await expect(ListRows.rowTick(ListRows.rightsRow(meta, TYPE_01))).toHaveCount(1);
    });

    test("S4: A format's market territories", async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s4', testInfo);
        const press = await scratchPress(ompApi, tag);
        // Given: Agent Ada and Agent Bert in that order, Supplier Sam;
        // "Paperback" with no sales rights and no market (footnote s).
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            representatives: [ADA, BERT, SAM],
            publicationFormats: [{name: 'Paperback'}],
        });
        const {page, seen, answers} = await pageAs(asUser, press.mg.username);
        const pf = new PublicationFormatsPage(page, press.path, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);

        // The window (Fields, the market window); "Date Format" on arrival
        // is A5, not read.
        let {win, meta} = await openPaperbackMetadata(pf);
        let market = await openAddMarket(meta);
        await expect(market.title()).toHaveText(exactly('Add Market'));
        expect(await market.labels()).toEqual([
            'Date',
            'Date Format',
            'Role',
            TEXT.agentHelp,
            'Agent',
            'Supplier',
            'Countries',
            'Included',
            'Excluded',
            'Regions',
            'Included',
            'Excluded',
            'Price',
            'Price Type',
            'Taxation Rate',
            'Taxation Type',
            'Discount percentage, if applicable',
        ]);
        await expect(market.dateBox()).toBeVisible();
        await expect(market.dateFormatList()).toBeVisible();
        await expect(market.chosen(market.dateRoleList())).toHaveText(exactly('Publication date (01)'));
        await expect(market.priceBox()).toBeVisible();
        await expect(market.chosen(market.currencyList())).toHaveText(exactly('Canadian Dollar (CAD)'));
        for (const list of [market.priceTypeList(), market.taxRateList(), market.taxTypeList()]) {
            await expect(list).toHaveValue('');
        }
        await expect(market.discountBox()).toBeVisible();
        await expect(market.cancelLink()).toBeVisible();
        await expect(market.okButton()).toBeVisible();

        // The book's representatives (Rule 14).
        expect(await optionTexts(market.agentList())).toEqual(['', 'Agent Ada', 'Agent Bert']);
        expect(await optionTexts(market.supplierList())).toEqual(['', 'Supplier Sam']);

        // Date and price required (Rule 13a): no request, nothing saved.
        const saves = [];
        page.on('request', (r) => {
            if (/markets-grid\/update-market/.test(r.url())) saves.push(r.url());
        });
        await market.okButton().click();
        await expect(await market.errorUnder(market.dateBox())).toHaveText(TEXT.required, {timeout: 30_000});
        await expect(await market.errorUnder(market.priceBox())).toHaveText(TEXT.required);
        await expect(market.dialog()).toHaveCount(1);
        expect(saves, 'the refused press sends nothing').toEqual([]);
        await expect(meta.listRows(LISTS.markets)).toHaveCount(0);

        // A market added (Rule 9); its "Territory" and "Price" are A4, not read.
        await market.dateBox().fill('20260915');
        await market.dateFormatList().selectOption({label: 'YYYYMMDD'});
        await market.agentList().selectOption({label: 'Agent Ada'});
        await market.supplierList().selectOption({label: 'Supplier Sam'});
        await market.territoryList('countries', 'Included').selectOption([{label: 'Canada (CA)'}]);
        await market.priceBox().fill('25');
        await expectNotice(page, TEXT.marketAdded, () => market.ok());
        const row = ListRows.marketRow(meta, 'Agent Ada, Supplier Sam');
        await expect(meta.listRows(LISTS.markets)).toHaveCount(1, {timeout: 30_000});
        await expect(row).toHaveCount(1);

        // Edited (Rule 9); its "Taxation Type" is A6, not read.
        market = await ListRows.openEdit(page, row, MarketWindow);
        await expect(market.title()).toHaveText(exactly('Edit'));
        await market.priceBox().fill('30');
        await expectNotice(page, TEXT.marketEdited, () => market.ok());
        await expect(meta.listRows(LISTS.markets)).toHaveCount(1, {timeout: 30_000});

        // Leaving a window (Fields, "Leaving a window").
        market = await openAddMarket(meta);
        await market.dateBox().fill('20261001');
        await market.dateBox().blur();
        const asked = seen.length;
        answers.push('dismiss');
        await market.closeArrow().click();
        await expect.poll(() => seen.length, {timeout: 30_000}).toBe(asked + 1);
        expect(seen[asked]).toEqual({type: 'confirm', message: TEXT.formChanged});
        await expect(market.dialog()).toHaveCount(1);
        await expect(market.dateBox()).toHaveValue('20261001');
        answers.push('accept');
        await market.closeArrow().click();
        await market.expectClosed();
        expect(seen[asked + 1]).toEqual({type: 'confirm', message: TEXT.formChanged});
        await expect(meta.listRows(LISTS.markets)).toHaveCount(1);

        // Control: the tab's own "Cancel", then the tab again: the market
        // kept without the tab's "Save" (Rule 9).
        await meta.cancelLink().click();
        await win.expectClosed();
        ({win, meta} = await openPaperbackMetadata(pf));
        await expect(meta.listRows(LISTS.markets)).toHaveCount(1);
        await expect(ListRows.marketRow(meta, 'Agent Ada, Supplier Sam')).toHaveCount(1);
    });

    test('S5: A new version copies the trade data', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s5', testInfo);
        const press = await scratchPress(ompApi, tag);
        // Given: a published book, audience "Children (02)", Agent Ada and
        // Supplier Sam, "Paperback" with a (01) entry and a market, both on
        // Canada (footnote s).
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            published: true,
            audience: {audience: 'Children (02)'},
            representatives: [ADA, SAM],
            publicationFormats: [
                {
                    name: 'Paperback',
                    salesRights: [{type: TYPE_01, countriesIncluded: ['Canada (CA)']}],
                    markets: [
                        {
                            date: '20260915',
                            dateFormat: 'YYYYMMDD',
                            price: '25',
                            agent: 'Agent Ada',
                            supplier: 'Supplier Sam',
                            countriesIncluded: ['Canada (CA)'],
                        },
                    ],
                },
            ],
        });
        const {page} = await pageAs(asUser, press.mg.username);
        const frame = new WorkflowPage(page, press.path, {appContext});
        await frame.gotoEditorial(book.submissionId);

        // "Create New Version" (Rule 15).
        const secondId = await createNewVersion(page);
        const pf = new PublicationFormatsPage(page, press.path, {appContext});
        await pf.gotoEditorial(book.submissionId, secondId);
        let {win, meta} = await openPaperbackMetadata(pf);
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(1, {timeout: 30_000});
        await expect(ListRows.rightsRow(meta, TYPE_01)).toHaveCount(1);
        await expect(meta.listRows(LISTS.markets)).toHaveCount(1);
        await expect(ListRows.marketRow(meta, 'Agent Ada, Supplier Sam')).toHaveCount(1);

        // The copy changed (Rules 9, 15).
        const del = await ListRows.openDelete(page, ListRows.rightsRow(meta, TYPE_01));
        await expectNotice(page, TEXT.rightsRemoved, () => del.ok());
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(0, {timeout: 30_000});
        const market = await ListRows.openEdit(page, ListRows.marketRow(meta, 'Agent Ada, Supplier Sam'), MarketWindow);
        await expect(market.priceBox()).toHaveValue('25');
        await market.priceBox().fill('30');
        await expectNotice(page, TEXT.marketEdited, () => market.ok());
        await meta.cancelLink().click();
        await win.expectClosed();

        // The book's own pages (Rule 1).
        const audience = new AudiencePage(page, press.path, {appContext});
        await audience.openFromMenu();
        await audience.expectChosen('audience', 'Children (02)');
        const rp = new RepresentativesPage(page, press.path, {appContext});
        await rp.openFromMenu();
        await expect(rp.names('Agents')).toHaveText([exactly('Agent Ada')]);
        await expect(rp.names('Suppliers')).toHaveText([exactly('Supplier Sam')]);

        // Control: the first version keeps its entry and its price 25 (Rule 15).
        await pf.openVersionFromMenu(0);
        ({win, meta} = await openPaperbackMetadata(pf));
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(1, {timeout: 30_000});
        await expect(ListRows.rightsRow(meta, TYPE_01)).toHaveCount(1);
        const first = await ListRows.openEdit(page, ListRows.marketRow(meta, 'Agent Ada, Supplier Sam'), MarketWindow);
        await expect(first.priceBox()).toHaveValue('25');
        await first.cancel();
    });

    test('S6: The ONIX tool, from the press\'s details to an export', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s6', testInfo);
        // Given: none of the four ONIX details; "Tidewater Tales" published,
        // "Harbour Lights" in the Submission stage (footnote s).
        const press = await scratchPress(ompApi, tag);
        await seedBook(ompApi, `${tag}t`, {context: press.path, submitter: press.au.username, title: 'Tidewater Tales', published: true});
        await ompApi.createSubmission({tag: `${tag}h`, context: press.path, submitter: press.au.username, title: 'Harbour Lights', submitted: true});
        const {page} = await pageAs(asUser, press.mg.username);

        // The details missing (Rule 16; Settings bullet 1): from the Tools list.
        const tools = new ToolsPage(page, press.path);
        await tools.goto();
        await tools.openTool(TEXT.onixTool);
        const onix = new OnixToolPage(page, press.path);
        await onix.expectReminderOnly();

        // The details filled (Rule 16; Settings bullet 1).
        await onix.pressSettingsLink().click();
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${press.path}/management/settings/context`), {timeout: 30_000});
        const settings = new SettingsPages(page, press.path);
        await expect(settings.tab('Masthead')).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        const masthead = new SettingsForm(page, '[name="publisher"]');
        await masthead.ready();
        await masthead.form.locator('[name="publisher"]').fill('Tidewater Press');
        await masthead.form.locator('[name="location"]').fill('Halifax');
        await masthead.form.locator('select[name="codeType"]').selectOption({label: 'ARK (35)'});
        await masthead.form.locator('[name="codeValue"]').fill('TWP-01');
        await masthead.save();

        // The "Export" tab (Rule 17; Fields, the export page).
        await onix.goto();
        await onix.expectTabs(['Export']);
        await onix.expectSelected('Export');
        await onix.list.expectLoaded();
        await expect(onix.list.title()).toHaveText(exactly('Monographs'));
        await expect(onix.list.searchBox()).toBeVisible();
        await expect(onix.list.filtersButton()).toBeVisible();
        await onix.list.expectTitles(['Tidewater Tales', 'Harbour Lights']);
        for (const title of ['Tidewater Tales', 'Harbour Lights']) {
            await expect(onix.list.box(title)).not.toBeChecked();
            await expect(onix.list.viewLink(title)).toBeVisible();
        }
        await expect(onix.validationBox()).toBeChecked();
        await expect(onix.validationLabel()).toHaveText(exactly(TEXT.validation));
        await expect(onix.list.selectButton()).toHaveText(exactly('Select All'));
        await expect(onix.list.exportButton()).toBeVisible();

        // Exporting (Rule 18): the results tab added and opened; what it
        // reads is A1, not read.
        await onix.list.box('Tidewater Tales').check();
        await onix.list.pressExport(onix);
        await onix.expectTabs(['Export', 'Export Submissions Results']);
        await onix.expectSelected('Export Submissions Results');

        // Control: "Publisher Code" emptied brings the reminder back
        // (Settings bullet 1).
        await emptyPublisherCode(page, press.path);
        await onix.open();
        await onix.expectReminderOnly();
    });

    test('S7: The trade data in a Native XML file', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s7', testInfo);
        // Given: the press's four ONIX details, "Press Publisher Name"
        // Tidewater Press; "Tidewater Tales" with its audience, three
        // representatives, "Paperback" and "Ebook" (footnote s).
        const press = await scratchPress(ompApi, tag, ONIX_DETAILS);
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            title: 'Tidewater Tales',
            audience: {
                audience: 'General / adult (01)',
                rangeQualifier: 'US school grade range (11)',
                rangeFrom: 'Kindergarten (K)',
                rangeTo: 'Twelfth Grade (12)',
            },
            representatives: [
                {...ADA, website: 'https://ada.example.org'},
                BERT,
                {...SAM, phone: '555-0100', email: 'sam@example.org', website: 'https://sam.example.org'},
            ],
            publicationFormats: [
                {
                    name: 'Paperback',
                    identificationCodes: [{type: 'ISBN-13 (15)', value: '978-951-98548-9-2'}],
                    salesRights: [
                        {type: TYPE_01, restOfWorld: true},
                        {
                            type: 'For sale with non-exclusive rights in the specified countries or territories (02)',
                            countriesIncluded: ['Canada (CA)', 'United States (US)'],
                            countriesExcluded: ['United Kingdom (GB)'],
                        },
                    ],
                    markets: [
                        {
                            date: '20260915',
                            dateFormat: 'YYYYMMDD',
                            price: '25',
                            currency: 'Canadian Dollar (CAD)',
                            taxType: 'VAT (Value-added tax) (01)',
                            taxRate: 'Zero-rated (Z)',
                            agent: 'Agent Ada',
                            supplier: 'Supplier Sam',
                            countriesIncluded: ['Canada (CA)'],
                        },
                    ],
                },
                {
                    name: 'Ebook',
                    markets: [{date: '20260915', dateFormat: 'YYYYMMDD', price: '12', countriesIncluded: ['United States (US)']}],
                },
            ],
        });
        const {page} = await pageAs(asUser, press.mg.username);

        // The file: each format carries an ONIX product (Rule 19).
        const xml = await nativeExport(page, press.path, 'Tidewater Tales');
        const products = await onixProducts(page, xml);
        expect(Object.keys(products).sort()).toEqual(['Ebook', 'Paperback']);
        expect(products.Paperback).toHaveLength(1);
        expect(products.Ebook).toHaveLength(1);
        const [paperback] = products.Paperback;
        const [ebook] = products.Ebook;

        // The audience (Rule 20).
        for (const product of [paperback, ebook]) {
            const audiences = descendants(product, 'Audience');
            expect(audiences).toHaveLength(1);
            expect(texts(audiences[0], 'AudienceCodeType')).toEqual(['01']);
            expect(texts(audiences[0], 'AudienceCodeValue')).toEqual(['01']);
            const ranges = descendants(product, 'AudienceRange');
            expect(ranges).toHaveLength(1);
            expect(ranges[0].c.map((k) => `${k.n}=${k.t}`)).toEqual([
                'AudienceRangeQualifier=11',
                'AudienceRangePrecision=03',
                'AudienceRangeValue=K',
                'AudienceRangePrecision=04',
                'AudienceRangeValue=12',
            ]);
        }

        // "Paperback"'s sales rights (Rule 21).
        const salesRights = descendants(paperback, 'SalesRights');
        expect(salesRights).toHaveLength(2);
        const rowRights = salesRights.find((s) => texts(s, 'SalesRightsType')[0] === '01');
        expect(rowRights, 'the "Rest of World?" entry (01)').toBeTruthy();
        const rowTerritory = children(/** @type {any} */ (rowRights), 'Territory')[0];
        expect(rowTerritory.c.map((k) => `${k.n}=${k.t}`)).toEqual(['RegionsIncluded=WORLD']);
        expect(texts(paperback, 'ROWSalesRightsType')).toEqual(['01']);
        const other = salesRights.find((s) => s !== rowRights);
        const otherTerritory = children(/** @type {any} */ (other), 'Territory')[0];
        const named = otherTerritory.c.flatMap((k) => k.t.split(/\s+/));
        expect(texts(otherTerritory, 'CountriesIncluded').join(' ').split(/\s+/).sort()).toEqual(['CA', 'US']);
        expect(named).not.toContain('GB');

        // "Paperback"'s market (Rule 22).
        const paperSupply = descendants(paperback, 'ProductSupply');
        expect(paperSupply).toHaveLength(1);
        const supply = paperSupply[0];
        expect(texts(supply, 'CountriesIncluded')).toEqual(['CA']);
        const agent = descendants(supply, 'PublisherRepresentative');
        expect(agent).toHaveLength(1);
        expect(texts(agent[0], 'AgentRole')).toEqual(['05']);
        expect(texts(agent[0], 'AgentName')).toEqual(['Agent Ada']);
        expect(texts(agent[0], 'WebsiteLink')).toEqual(['https://ada.example.org']);
        const date = descendants(supply, 'MarketDate');
        expect(date).toHaveLength(1);
        expect(texts(date[0], 'Date')).toEqual(['20260915']);
        expect(texts(date[0], 'MarketDateRole')).toEqual(['01']);
        expect(texts(date[0], 'DateFormat')).toEqual(['00']);
        const supplier = descendants(supply, 'Supplier');
        expect(supplier).toHaveLength(1);
        expect(texts(supplier[0], 'SupplierRole')).toEqual(['12']);
        expect(texts(supplier[0], 'SupplierName')).toEqual(['Supplier Sam']);
        expect(texts(supplier[0], 'TelephoneNumber')).toEqual(['555-0100']);
        expect(texts(supplier[0], 'EmailAddress')).toEqual(['sam@example.org']);
        const links = texts(supplier[0], 'WebsiteLink');
        expect(links).toContain('https://sam.example.org');
        expect(links.filter((l) => l.endsWith(`/index.php/${press.path}/catalog/book/${book.submissionId}`))).toHaveLength(1);
        const price = descendants(supply, 'Price');
        expect(price).toHaveLength(1);
        expect(texts(price[0], 'PriceAmount')).toEqual(['25']);
        expect(texts(price[0], 'CurrencyCode')).toEqual(['CAD']);
        const tax = descendants(price[0], 'Tax');
        expect(tax).toHaveLength(1);
        expect(texts(tax[0], 'TaxType')).toEqual(['01']);
        expect(texts(tax[0], 'TaxRateCode')).toEqual(['Z']);
        expect(Number(texts(tax[0], 'TaxRatePercent')[0])).toBe(0);
        expect(texts(tax[0], 'TaxableAmount')).toEqual(['25']);

        // "Ebook"'s market: no agent, the press as supplier (Rule 22); the
        // Paperback's ISBN as an alternative format (Rule 24a).
        const ebookSupply = descendants(ebook, 'ProductSupply');
        expect(ebookSupply).toHaveLength(1);
        expect(texts(ebookSupply[0], 'CountriesIncluded')).toEqual(['US']);
        expect(descendants(ebookSupply[0], 'PublisherRepresentative')).toHaveLength(0);
        const press09 = descendants(ebookSupply[0], 'Supplier');
        expect(press09).toHaveLength(1);
        expect(texts(press09[0], 'SupplierRole')).toEqual(['09']);
        expect(texts(press09[0], 'SupplierName')).toEqual(['Tidewater Press']);
        expect(texts(press09[0], 'EmailAddress')).toEqual(['admin@mail.test']);
        const homeLinks = texts(press09[0], 'WebsiteLink');
        expect(homeLinks.filter((l) => new RegExp(`/index\\.php/${press.path}/?$`).test(l))).toHaveLength(1);
        const related = descendants(ebook, 'RelatedProduct').flatMap((r) => texts(r, 'IDValue'));
        expect(related.map((v) => v.replace(/-/g, ''))).toContain('9789519854892');

        // A representative no market names (Rule 23).
        expect(xml).not.toContain('Agent Bert');

        // Control: "Publisher Code" emptied, the same export carries no
        // product (Rule 19; Settings bullet 1). A fresh page, so the
        // download is the new file.
        await emptyPublisherCode(page, press.path);
        const fresh = await pageAs(asUser, press.mg.username);
        const bare = await nativeExport(fresh.page, press.path, 'Tidewater Tales');
        const bareProducts = await onixProducts(fresh.page, bare);
        expect(Object.keys(bareProducts).sort()).toEqual(['Ebook', 'Paperback']);
        expect(bareProducts.Paperback).toHaveLength(0);
        expect(bareProducts.Ebook).toHaveLength(0);
    });

    test('S8: The trade data imported on another press', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s8', testInfo);
        // Given: presses A and B with the four ONIX details, the same
        // throwaway Press manager; "Tidewater Tales" on A (footnote s).
        const a = await scratchPress(ompApi, `${tag}a`, ONIX_DETAILS);
        const b = `${tag}b`;
        await ompApi.createContext({
            tag: b,
            context: {name: `Press ${b}`, acronym: 'TWB', country: 'CA'},
            users: [{username: a.mg.username, roles: ['manager']}],
            ...ONIX_DETAILS,
        });
        await seedBook(ompApi, `${tag}t`, {
            context: a.path,
            submitter: a.au.username,
            title: 'Tidewater Tales',
            audience: {
                audience: 'Children (02)',
                rangeQualifier: 'US school grade range (11)',
                rangeFrom: 'Kindergarten (K)',
                rangeTo: 'Twelfth Grade (12)',
            },
            representatives: [ADA, BERT, SAM],
            publicationFormats: [
                {
                    name: 'Paperback',
                    salesRights: [
                        {
                            type: TYPE_01,
                            countriesIncluded: ['Canada (CA)', 'United States (US)'],
                            countriesExcluded: ['United Kingdom (GB)'],
                        },
                    ],
                    markets: [
                        {
                            date: '20260915',
                            dateFormat: 'YYYYMMDD',
                            price: '25',
                            agent: 'Agent Ada',
                            supplier: 'Supplier Sam',
                            countriesIncluded: ['Canada (CA)'],
                            countriesExcluded: ['United Kingdom (GB)'],
                        },
                    ],
                },
            ],
        });
        const {page} = await pageAs(asUser, a.mg.username);

        // A's file (Import & export, its Rule 16).
        const xml = await nativeExport(page, a.path, 'Tidewater Tales');
        const file = testInfo.outputPath('tidewater-from-a.xml');
        fs.writeFileSync(file, xml);

        // Imported on B (Import & export, its Rule 10).
        const nativeB = new NativeXmlPage(page, b, NATIVE);
        await nativeB.goto();
        await nativeB.expectSelected('Import');
        await nativeB.upload(file);
        const imported = await nativeB.pressImport();
        await expect(imported).toContainText('The import completed successfully. The following items were imported:');
        const itemLine = resultLines(imported).filter({hasText: /^\s*"\d+" - "Tidewater Tales"\s*$/});
        await expect(itemLine).toHaveCount(1);
        const number = Number(((await itemLine.innerText()).match(/"(\d+)"/) || [])[1]);
        expect(number).toBeGreaterThan(0);

        // The audience (Rule 25a).
        const audience = new AudiencePage(page, b, {appContext});
        await audience.frame.gotoEditorial(number);
        await audience.openFromMenu();
        await audience.expectChosen('audience', 'Children (02)');
        await audience.expectChosen('audienceRangeQualifier', 'US school grade range (11)');
        await audience.expectChosen('audienceRangeFrom', 'Kindergarten (K)');
        await audience.expectChosen('audienceRangeTo', 'Twelfth Grade (12)');

        // The representatives (Rule 25b); the suppliers' count is A19, not read.
        const rp = new RepresentativesPage(page, b, {appContext});
        await rp.openFromMenu();
        await rp.expectListed('Agents', 'Agent Ada', 'Exclusive sales agent (05)');
        await rp.expectListed('Suppliers', 'Supplier Sam', DISTRIBUTOR);

        // The format's lists (Rules 21, 22, 25a).
        const pf = new PublicationFormatsPage(page, b, {appContext});
        await pf.openFromMenu();
        const {win, meta} = await openPaperbackMetadata(pf);
        await expect(meta.listRows(LISTS.salesRights)).toHaveCount(1, {timeout: 30_000});
        const rights = await ListRows.openEdit(page, ListRows.rightsRow(meta, TYPE_01), SalesRightsWindow);
        await expect.poll(() => chosenTexts(rights.territoryList('countries', 'Included'))).toEqual(['Canada (CA)', 'United States (US)']);
        await expect.poll(() => chosenTexts(rights.territoryList('countries', 'Excluded'))).toEqual([]);
        await rights.cancel();
        await expect(meta.listRows(LISTS.markets)).toHaveCount(1);
        const market = await ListRows.openEdit(page, ListRows.marketRow(meta, 'Agent Ada, Supplier Sam'), MarketWindow);
        await expect(market.dateBox()).toHaveValue('20260915');
        await expect.poll(() => chosenTexts(market.territoryList('countries', 'Included'))).toEqual(['Canada (CA)']);
        await expect.poll(() => chosenTexts(market.territoryList('countries', 'Excluded'))).toEqual([]);
        await expect(market.priceBox()).toHaveValue('25');
        await market.cancel();
        await meta.cancelLink().click();
        await win.expectClosed();

        // Control: no "Agent Bert", whom no market named (Rules 23, 25b).
        await rp.openFromMenu();
        await expect(rp.names('Agents').first()).toBeVisible();
        await expect(rp.row('Agents', 'Agent Bert')).toHaveCount(0);
        await expect(rp.row('Suppliers', 'Agent Bert')).toHaveCount(0);
    });

    test('S9: No ONIX on a journal or a preprint server: the absence, its press control', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s9', testInfo);
        // Given (the press side): the Press manager's book in Production
        // with "Paperback" (footnote s).
        const book = await seedBook(ompApi, tag, {publicationFormats: [{name: 'Paperback'}]});
        const {page} = await pageAs(asUser, MANAGER);
        const frame = new WorkflowPage(page, PRESS, {appContext});
        await frame.gotoEditorial(book.submissionId);

        // Control: the side menu lists the "Marketing" group (Purpose).
        const entries = await frame.menuEntries();
        expect(entries.filter((e) => e.level === 1).map((e) => e.label)).toContain('Marketing');
        await expect(frame.menuLink('Marketing')).toBeVisible();

        // "Paperback"'s "Edit": the tabs "Edit" and "Metadata", the latter
        // holding "Sales Rights" and "Market Territories" (Purpose).
        const pf = new PublicationFormatsPage(page, PRESS, {appContext});
        await pf.openFromMenu();
        const win = await pf.openEdit('Paperback');
        await expect(win.tabs()).toHaveText([exactly('Edit'), exactly('Metadata')]);
        const meta = await win.openMetadata();
        await expect(meta.listHeading(LISTS.salesRights)).toHaveText(exactly('Sales Rights'));
        await expect(meta.listHeading(LISTS.markets)).toHaveText(exactly('Market Territories'));

        // Tools › "Import/Export" lists the ONIX tool beside "Native XML
        // Plugin" (Purpose).
        const tools = new ToolsPage(page, PRESS);
        await tools.goto();
        await expect(tools.toolLink('Native XML Plugin')).toBeVisible();
        await expect(tools.toolLink(TEXT.onixTool)).toBeVisible();
    });
});
