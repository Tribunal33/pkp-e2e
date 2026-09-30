// @ts-check
/**
 * @file playwright/tests/U73-publication-formats-proof-terms.spec.js
 *
 * U73 — Publication formats & proof terms, OMP suite: one test per
 * canonical scenario the spec runs on a press, S2–S10 here, plus S11's
 * press side (its control: the seeded press's book offers "Publication
 * Formats"; the journal's and the preprint server's absence run in their
 * own suites, since CI installs one app per job). S1 lives in
 * `tests/serial/U73-publication-formats-proof-terms.spec.js`: its mailbox
 * is read after the job queue has run (footnote s), and only the serial
 * project drains the shared queue (patterns.md, parallel lesson 7).
 * Spec: docs/specs/U73-publication-formats-proof-terms.md
 *
 * Deliberately NOT covered, by register ID (the spec's Coverage section is
 * the record of everything else left out; a 🐞 is never asserted as the
 * contract, a ❓ is not a gap):
 * - A1 🐞: S3's Layout Editor presses neither "Not Available" nor "Set
 *   Terms"; they are read as offered.
 * - A11 🐞: S5 opens "Format Availability" on an available format without
 *   reading its sentence.
 * - A19 🐞: S4 never reads the "Select Files" sentence.
 * - A22 ❓, A23 🐞: S2 reads neither the date window's "Role" on arrival
 *   nor what the window shows on a refused date; the refusal is read as
 *   the window staying open with no row added.
 * - A6 🐞: S2 reads no group after "Imprint (Brand Name)".
 * - A2–A5, A7–A10, A12–A18, A20, A21: no scenario reaches those states.
 *
 * Seeding: scenario endpoints only; the seeded press and roster are
 * read-only (PRINCIPLES A1, A7). Every book is a scratch submission in
 * Production (`skipExternalReview`, `sendToProduction`); formats come from
 * `publicationFormats[]` (Approved, Available, the file on "Open Access"
 * and still "Awaiting Approval"; `genre: 'Book Manuscript'`). S3, S4, S5,
 * S7, S9 and S11 run on `publicknowledge` with the roster (footnote s).
 * S2 and S8 read the notices of the Metadata lists and of a format's
 * delete: a notice is queued per user on the server and drained by any
 * page load of that user, so a roster account's notice can be taken, or
 * shown, by a parallel test (patterns.md, parallel lesson 2); those two
 * scenarios run on a scratch press with a throwaway Press manager and a
 * throwaway Author, the given's roles unchanged. S6 and S10 build the
 * scratch presses their givens name. A notice's absence is read from the
 * notice fetch the page makes after the action (its `content` empty), so
 * the silence is bounded by the answer that would carry it. The visitor
 * is the fixture `page`, which has no user (no default user is set; every
 * actor opens through `asUser`, patterns.md "Fixture selection"). Format
 * file downloads (`catalog/download/…`) answer 500 on OMP main (seed-facts,
 * the U69 blocker), so the book page's links are read and the view page
 * opened, never a download followed. The remote format's address is
 * answered in the browser by a route, so no test reaches example.org.
 * Tags are unique per run (M5); waits are web-first (A5). Everything here
 * runs in the parallel `omp` project.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {
    TEXT,
    SALES,
    LISTS,
    DEFAULT_KIND,
    exactly,
    watchDialogs,
    expectNoNotice,
    expectNotice,
    pastCloseWindow,
    windowByTitle,
    PublicationFormatsPage,
    CodeWindow,
    BookFormats,
} = require('../pages/PublicationFormatPages.js');
const {createNewVersion} = require('../pages/PublicationPages.js');
const {ChaptersPage} = require('../pages/ChapterPages.js');
const {openProduction, PRODUCTION_READY_FILES} = require('../pages/ProductionStagePages.js');
const {fileRow: stageFileRow} = require('../pages/CopyeditingStagePages.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {closeTab} = require('../../../../shared/playwright/support/tabs.js');

const PRESS = 'publicknowledge';
const MANAGER = 'manager.maya';
const AUTHOR = 'author.alex';
const SERIES_EDITOR = 'sectioneditor.ana';
const LAYOUT_EDITOR = 'layouteditor.leo';

const FILES = path.join(__dirname, '..', 'fixtures', 'files');
const ARTICLE = path.join(FILES, 'article.pdf');

const PRODUCTION = {submitted: true, decisions: ['skipExternalReview', 'sendToProduction']};

/** Unique per-run tag: one alphanumeric token, scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u73${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A seeded format with its file: `publicationFormats[]` (footnote s). */
function format(name, file) {
    return file ? {name, file, genre: 'Book Manuscript'} : {name};
}

/**
 * A scratch press with a throwaway Press manager and a throwaway Author;
 * `keys` are extra context keys.
 */
async function scratchPress(ompApi, tag, keys = {}) {
    const mg = {username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', email: `${tag}mg@mail.test`, roles: ['manager']};
    const au = {username: `${tag}au`, givenName: 'Ava', familyName: 'Author', email: `${tag}au@mail.test`, roles: ['author']};
    await ompApi.createContext({tag, context: {name: `Press ${tag}`}, users: [mg, au], ...keys});
    return {path: tag, mg, au};
}

/** A scratch book in Production; `context` defaults to the seeded press, `submitter` to its Author. */
async function seedBook(ompApi, tag, {context = PRESS, submitter = AUTHOR, ...rest} = {}) {
    return ompApi.createSubmission({tag, context, submitter, title: `Book ${tag}`, ...PRODUCTION, ...rest});
}

/** A page as `username`, its browser dialogs answered by `watchDialogs`. */
async function pageAs(asUser, username) {
    const page = await (await asUser(username)).newPage();
    return {page, ...watchDialogs(page)};
}

/**
 * The regexes of an array read in order: each must match an entry after
 * the previous one's.
 */
function expectInOrder(actual, patterns) {
    let at = -1;
    for (const pattern of patterns) {
        const next = actual.findIndex((text, i) => i > at && pattern.test(text));
        expect(next, `${pattern} after entry ${at} in ${JSON.stringify(actual)}`).toBeGreaterThan(at);
        at = next;
    }
}

/**
 * A list the app does not order, read as a set (patterns.md, parallel
 * lesson 14): the count first, then the sorted texts, polled.
 */
async function expectSet(locator, texts) {
    await expect(locator).toHaveCount(texts.length, {timeout: 30_000});
    await expect
        .poll(async () => (await locator.allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).sort(), {timeout: 30_000})
        .toEqual([...texts].sort());
}

test.describe('Publication formats & proof terms (U73)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test("S2: A format's catalog data", async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s2', testInfo);
        const press = await scratchPress(ompApi, tag);
        // Given: a book in Production with "PDF", holding article.pdf,
        // "Approved" and "Available" (footnote s).
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            publicationFormats: [format('PDF', 'article.pdf')],
        });
        const {page} = await pageAs(asUser, press.mg.username);
        const pf = new PublicationFormatsPage(page, press.path, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);

        // The "Metadata" tab: "Edit" opens on its "Edit" tab with
        // "Metadata" beside it; the tab's lists and fields top to bottom.
        let win = await pf.openEdit('PDF');
        await expect(win.tabs()).toHaveText([exactly('Edit'), exactly('Metadata')]);
        await expect(win.tab('Edit')).toHaveAttribute('aria-selected', 'true');
        let meta = await win.openMetadata();
        expectInOrder(await meta.labelsTopToBottom(), [
            /^Product Identification$/,
            /^Add Code$/,
            /^Sales Rights$/,
            /^Add Sales Rights$/,
            /^Market Territories$/,
            /^Add Market$/,
            /^Publication Dates$/,
            /^Add publication date$/,
            /^Product Composition/,
            /^Product Detail \(not required\)/,
            /^Product Availability/,
            /^Imprint \(Brand Name\)/,
            /^Cancel$/,
            /^Save$/,
        ]);
        await expect(meta.compositionList()).toHaveValue('');
        await expect(meta.detailList()).toHaveValue('');
        await expect(meta.chosen(meta.availabilityList())).toHaveText(exactly('Available (20)'));
        await expect(meta.imprintBox()).toBeVisible();
        await expect(meta.cancelLink()).toBeVisible();
        await expect(meta.saveButton()).toBeVisible();

        // "Product Composition" required: refused in the page, the window
        // stays (Rule 17a).
        await meta.imprintBox().fill('Tidewater Books');
        await meta.saveButton().click();
        await expect(meta.compositionError()).toBeVisible({timeout: 30_000});
        await expect(win.dialog()).toHaveCount(1);

        // Saved: the window closes with no notice; "PDF" still "Available".
        await meta.compositionList().selectOption({label: 'Multiple-component retail product (10)'});
        await meta.availabilityList().selectOption({label: 'Not yet available (10)'});
        await expectNoNotice(page, () => meta.save());
        await expect(pf.rowLink(pf.formatRow('PDF'), 'Available')).toBeVisible({timeout: 30_000});
        win = await pf.openEdit('PDF');
        meta = await win.openMetadata();
        await expect(meta.chosen(meta.compositionList())).toHaveText(exactly('Multiple-component retail product (10)'));
        await expect(meta.chosen(meta.availabilityList())).toHaveText(exactly('Not yet available (10)'));
        await expect(meta.imprintBox()).toHaveValue('Tidewater Books');
        await meta.cancelLink().click();
        await win.expectClosed();

        // The ISBN boxes: the 13-digit box becomes an "ISBN-13 (15)" code (Rule 7).
        win = await pf.openEdit('PDF');
        await win.type(win.isbn13Box(), '978-951-98548-9-2');
        await win.ok();
        win = await pf.openEdit('PDF');
        meta = await win.openMetadata();
        await meta.expectRowCells(LISTS.codes, '978-951-98548-9-2', ['978-951-98548-9-2', 'ISBN-13 (15)']);
        await expect(meta.listColumns(LISTS.codes)).toHaveText([exactly('Code Value'), exactly('ONIX Code Type')]);

        // "Add Code": the window, without "ISBN-13 (15)" in its list (Rule 18a).
        let code = await meta.openAddCode();
        await expect(code.labels()).toHaveText([/^Code Value\*?$/, /^ONIX Code Type\*?$/]);
        await expect(code.okButton()).toBeVisible();
        await expect(code.cancelLink()).toBeVisible();
        await expect(code.typeOptions().filter({hasText: exactly('ISBN-13 (15)')})).toHaveCount(0);
        await expect(code.typeOptions().filter({hasText: exactly('ISBN-10 (Discontinued)')})).toHaveCount(1);
        // An empty "Code Value": refused under the box, no row added.
        await code.okButton().click();
        await expect(code.valueError()).toBeVisible({timeout: 30_000});
        await expect(meta.listRows(LISTS.codes)).toHaveCount(1);
        // A valid code: the row and the notice (Rule 18).
        await code.typeList().selectOption({label: 'ISBN-10 (Discontinued)'});
        await code.valueBox().fill('951-98548-9-4');
        await expectNotice(page, TEXT.codeAdded, () => code.ok());
        await meta.expectRowCells(LISTS.codes, '951-98548-9-4', ['951-98548-9-4', 'ISBN-10 (Discontinued)']);

        // A code edited and deleted (Rule 18).
        await meta.pressRowEntry(LISTS.codes, '951-98548-9-4', 'Edit');
        code = new CodeWindow(page);
        await code.expectOpen();
        await code.valueBox().fill('951-98548-9-5');
        await expectNotice(page, TEXT.codeEdited, () => code.ok());
        await expect(meta.row(LISTS.codes, '951-98548-9-5')).toHaveCount(1, {timeout: 30_000});
        await expect(meta.row(LISTS.codes, '951-98548-9-4')).toHaveCount(0);
        await meta.pressRowEntry(LISTS.codes, '951-98548-9-5', 'Delete');
        const confirm = page.getByRole('dialog', {name: 'Delete', exact: true});
        await expect(confirm.getByText(TEXT.deleteQuestion, {exact: true})).toBeVisible({timeout: 30_000});
        await expectNotice(page, TEXT.codeRemoved, async () => {
            await confirm.getByRole('button', {name: 'OK', exact: true}).click();
            await expect(confirm).toHaveCount(0, {timeout: 30_000});
        });
        await expect(meta.row(LISTS.codes, '951-98548-9-5')).toHaveCount(0, {timeout: 30_000});
        await expect(meta.row(LISTS.codes, '978-951-98548-9-2')).toHaveCount(1);
        await pastCloseWindow(page);

        // A publication date (Rules 19, 19b): the window; an empty date
        // refused under the box; a seven-character date kept open with no
        // row; eight characters added with the notice.
        const date = await meta.openAddDate();
        await expect(date.labels()).toHaveText([/^Date\*?$/, /^Date Format\*?$/, /^Role\*?$/]);
        await expect(date.okButton()).toBeVisible();
        await expect(date.cancelLink()).toBeVisible();
        await date.formatList().selectOption({label: 'YYYYMMDD'});
        await date.okButton().click();
        await expect(date.dateError()).toBeVisible({timeout: 30_000});
        await date.dateBox().fill('2026091');
        const refused = await date.pressOk();
        expect(refused.ok(), `a seven-character date answered ${refused.status()}`).toBe(true);
        await expect(date.dateBox()).toBeVisible();
        await expect(meta.listRows(LISTS.dates)).toHaveCount(0);
        await date.dateBox().fill('20260915');
        await expectNotice(page, TEXT.dateAdded, async () => {
            const added = await date.pressOk();
            expect(added.ok()).toBe(true);
            await expect(date.form()).toHaveCount(0, {timeout: 30_000});
        });
        await expect(meta.listRows(LISTS.dates)).toHaveCount(1, {timeout: 30_000});
        await expect(meta.listRows(LISTS.dates)).toContainText('20260915');
        await expect(meta.listColumns(LISTS.dates)).toHaveText([exactly('Date'), exactly('Role')]);
        await pastCloseWindow(page);

        // Control: the 13-digit box emptied removes its code (Rule 7).
        await win.openEditTab();
        await expect(win.isbn13Box()).toHaveValue('978-951-98548-9-2');
        await win.type(win.isbn13Box(), '');
        await win.ok();
        win = await pf.openEdit('PDF');
        meta = await win.openMetadata();
        await expect(meta.listEmpty(LISTS.codes)).toHaveText(exactly(TEXT.noItems));
        await expect(meta.row(LISTS.codes, '978-951-98548-9-2')).toHaveCount(0);
        await expect(meta.listRows(LISTS.dates)).toHaveCount(1);
    });

    test('S3: A Layout Editor and a Series editor build a format', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s3', testInfo);
        // Given: the Author's book in Production with no format, the
        // Layout Editor and the Series editor assigned (footnote s).
        const book = await seedBook(ompApi, tag, {
            participants: [
                {username: SERIES_EDITOR, role: 'sectionEditor'},
                {username: LAYOUT_EDITOR, role: 'layoutEditor'},
            ],
        });

        // The Layout Editor's page (Actors row 1).
        const le = await pageAs(asUser, LAYOUT_EDITOR);
        const lePf = new PublicationFormatsPage(le.page, PRESS, {appContext});
        await lePf.gotoEditorial(book.submissionId, book.publicationId);
        await expect(lePf.addLink()).toBeVisible();
        await expect(lePf.columnHeads()).toHaveText([exactly('Name'), exactly('Complete'), exactly('Availability')]);

        // "EPUB" added (Rule 4; Actors row 2).
        const add = await lePf.openAdd();
        await add.typeName('EPUB');
        await add.ok();
        const epub = lePf.formatRow('EPUB');
        await expect(lePf.formatLabel('EPUB')).toHaveText(exactly(`EPUB${DEFAULT_KIND}`), {timeout: 30_000});
        await expect(lePf.rowLink(epub, 'Awaiting Approval')).toBeVisible();
        await expect(lePf.rowLink(epub, 'Not Available')).toBeVisible();
        await expect(lePf.lineUnder('EPUB')).toHaveText(exactly(TEXT.noItems));
        await expect(await lePf.openRowEntries(epub)).toHaveText([exactly('Edit'), exactly('Delete')]);

        // A file uploaded (Rule 9; Actors row 3).
        await lePf.uploadWithChangeFile('EPUB', ARTICLE);
        const file = lePf.fileRow('EPUB', 'article.pdf');
        await expect(lePf.rowLink(file, 'Awaiting Approval')).toBeVisible({timeout: 30_000});
        await expect(lePf.rowLink(file, 'Set Terms')).toBeVisible();
        await expect(await lePf.openRowEntries(file)).toHaveText([
            exactly('More Information'),
            exactly('Edit'),
            exactly('Delete'),
        ]);

        // Both approved (Rules 12, 13; Actors row 4).
        await (await lePf.openStatus(epub, 'Awaiting Approval', 'Format Approval')).ok();
        await expect(lePf.rowLink(epub, 'Approved')).toBeVisible({timeout: 30_000});
        await (await lePf.openStatus(file, 'Awaiting Approval', 'Approve Proof')).ok();
        await expect(lePf.rowLink(file, 'Approved')).toBeVisible({timeout: 30_000});
        // The row also offers "Not Available" and "Set Terms" (A1: not pressed).
        await expect(lePf.rowLink(epub, 'Not Available')).toBeVisible();
        await expect(lePf.rowLink(file, 'Set Terms')).toBeVisible();

        // The Series editor: terms and availability (Rules 14, 15; Actors rows 3, 5).
        const se = await pageAs(asUser, SERIES_EDITOR);
        const sePf = new PublicationFormatsPage(se.page, PRESS, {appContext});
        await sePf.gotoEditorial(book.submissionId, book.publicationId);
        const seEpub = sePf.formatRow('EPUB');
        const seFile = sePf.fileRow('EPUB', 'article.pdf');
        await expect(sePf.rowLink(seEpub, 'Approved')).toBeVisible();
        await expect(sePf.rowLink(seEpub, 'Not Available')).toBeVisible();
        await expect(sePf.rowLink(seFile, 'Approved')).toBeVisible();
        await expect(sePf.rowLink(seFile, 'Set Terms')).toBeVisible();
        const terms = await sePf.openTerms('EPUB', 'article.pdf');
        await terms.choose(SALES.openAccess);
        await terms.save();
        await expect(sePf.rowLink(seFile, 'Open Access')).toBeVisible({timeout: 30_000});
        await (await sePf.openStatus(seEpub, 'Not Available', 'Format Availability')).ok();
        await expect(sePf.rowLink(seEpub, 'Available')).toBeVisible({timeout: 30_000});

        // Control: the Author's list shows the name, the kind and the file,
        // and none of the states (Rule 3).
        const au = await pageAs(asUser, AUTHOR);
        const auPf = new PublicationFormatsPage(au.page, PRESS, {appContext});
        await auPf.gotoAuthor(book.submissionId, book.publicationId);
        await expect(auPf.formatLabel('EPUB')).toHaveText(exactly(`EPUB${DEFAULT_KIND}`));
        await expect(auPf.fileNameLink('EPUB', 'article.pdf')).toBeVisible();
        await expect(auPf.statusLinks()).toHaveCount(0);
        await expect(auPf.grid()).not.toContainText('Approved');
        await expect(auPf.grid()).not.toContainText('Available');
        await expect(auPf.grid()).not.toContainText('Open Access');
    });

    test('S4: Files added with "Select Files", and a file\'s approval revoked', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s4', testInfo);
        // Given: replacement.pdf among the Production Ready Files, "PDF"
        // holding article.pdf (footnote s).
        const book = await seedBook(ompApi, tag, {
            files: [{file: 'replacement.pdf', list: 'productionReady'}],
            publicationFormats: [format('PDF', 'article.pdf')],
        });
        const {page, seen} = await pageAs(asUser, MANAGER);
        const pf = new PublicationFormatsPage(page, PRESS, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);

        // "Select Files": the window (Rule 10; its sentence is A19, unread).
        let select = await pf.openSelectFiles('PDF');
        await expect(select.listHeading()).toHaveText(exactly('Page Proofs'));
        await expect(select.columnHeads()).toHaveText([exactly('Select'), exactly('Name'), exactly('Component')]);
        await expect(select.fileBox('replacement.pdf')).not.toBeChecked();
        await expect(select.allStagesLabel()).toBeVisible();
        await expect(select.allStagesBox()).toBeVisible();
        await expect(select.cancelLink()).toBeVisible();
        await expect(select.okButton()).toBeVisible();

        // Closed from its arrow: at once, nothing asked, nothing copied (Rule 10a).
        await select.fileBox('replacement.pdf').check();
        const asked = seen.length;
        await select.closeArrow().click();
        await expect(select.dialog()).toHaveCount(0, {timeout: 30_000});
        expect(seen.slice(asked), 'the close arrow asked nothing').toEqual([]);
        await pf.reload();
        await expect(pf.fileRows('PDF')).toHaveCount(1);
        await expect(pf.fileRow('PDF', 'article.pdf')).toHaveCount(1);

        // A file copied (Rule 10a).
        select = await pf.openSelectFiles('PDF');
        await select.fileBox('replacement.pdf').check();
        await select.ok();
        const copy = pf.fileRow('PDF', 'replacement.pdf');
        await expect(copy).toHaveCount(1, {timeout: 30_000});
        await expect(pf.rowLink(copy, 'Awaiting Approval')).toBeVisible();
        await expect(pf.rowLink(copy, 'Set Terms')).toBeVisible();

        // A format file's actions (Rule 11).
        const article = pf.fileRow('PDF', 'article.pdf');
        await expect(await pf.openRowEntries(article)).toHaveText([
            exactly('More Information'),
            exactly('Edit'),
            exactly('Delete'),
        ]);
        await pf.pressRowEntry(article, 'More Information');
        const info = page.locator('[role="dialog"]').filter({has: page.locator('.pkp_controllers_informationCenter')});
        await expect(info.getByRole('tab', {name: 'History'})).toBeVisible({timeout: 30_000});
        await info.getByRole('button', {name: 'Close', exact: true}).last().click();
        await expect(info).toHaveCount(0, {timeout: 30_000});
        await pastCloseWindow(page);
        await pf.pressRowEntry(article, 'Edit');
        const editFile = windowByTitle(page, 'Edit a file');
        await expect(editFile.locator('[role="tab"]').filter({hasText: exactly('Edit Metadata')})).toHaveAttribute(
            'aria-selected',
            'true',
            {timeout: 30_000}
        );
        await editFile.getByRole('button', {name: 'Close', exact: true}).last().click();
        await expect(editFile).toHaveCount(0, {timeout: 30_000});
        await pastCloseWindow(page);

        // Approved and revoked (Rule 13).
        let status = await pf.openStatus(article, 'Awaiting Approval', 'Approve Proof');
        await expect(status.text(TEXT.proofApprove)).toBeVisible();
        await status.ok();
        await expect(pf.rowLink(article, 'Approved')).toBeVisible({timeout: 30_000});
        status = await pf.openStatus(article, 'Approved', 'Revoke Proof Approval');
        await expect(status.text(TEXT.proofRevoke)).toBeVisible();
        await status.ok();
        await expect(pf.rowLink(article, 'Awaiting Approval')).toBeVisible({timeout: 30_000});

        // The copy deleted as on any file list (Rule 11).
        await pf.pressRowEntry(copy, 'Delete');
        const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure'});
        await expect(confirm).toBeVisible({timeout: 30_000});
        await confirm.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(confirm).toHaveCount(0, {timeout: 30_000});
        await expect(pf.fileRow('PDF', 'replacement.pdf')).toHaveCount(0, {timeout: 30_000});
        await expect(pf.fileRows('PDF')).toHaveCount(1);
        await expect(pf.fileRow('PDF', 'article.pdf')).toHaveCount(1);

        // Control: the Production Ready Files still list replacement.pdf (Rule 10a).
        const modal = await openProduction(page, PRESS, book.submissionId);
        await expect(stageFileRow(modal, PRODUCTION_READY_FILES, 'replacement.pdf')).toHaveCount(1, {timeout: 30_000});
    });

    test("S5: A published book's formats, withdrawn and restored", async ({page, asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s5', testInfo);
        // Given: the Author's published book, "PDF" with article.pdf and
        // "EPUB" with replacement.pdf, each Approved, Available, the file
        // on "Open Access" (footnote s).
        const book = await seedBook(ompApi, tag, {
            published: true,
            publicationFormats: [format('PDF', 'article.pdf'), format('EPUB', 'replacement.pdf')],
        });
        const mg = await pageAs(asUser, MANAGER);
        const pf = new PublicationFormatsPage(mg.page, PRESS, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);

        // The warning above the list (Rule 16).
        await expect(pf.mainText(TEXT.publishedWarning)).toBeVisible();
        const main = await pf.mainColumn().innerText();
        expect(main.indexOf(TEXT.publishedWarning), 'the warning stands above the list').toBeLessThan(
            main.indexOf(TEXT.gridHeading, main.indexOf(TEXT.publishedWarning))
        );
        await expect(pf.addLink()).toBeVisible();
        await expect(pf.columnHeads()).toHaveText([exactly('Name'), exactly('Complete'), exactly('Availability')]);

        // The book's page: "PDF" and "EPUB", each a link reading its
        // format's name that opens the file's view page.
        const reader = new BookFormats(page, PRESS);
        await reader.goto(book.submissionId);
        await expectSet(reader.links(), ['PDF', 'EPUB']);
        for (const name of ['PDF', 'EPUB']) {
            const href = await reader.fileLink(name).getAttribute('href');
            expect(href).toMatch(new RegExp(`/catalog/view/${book.submissionId}/\\d+/\\d+$`));
        }
        const view = await page.goto(/** @type {string} */ (await reader.fileLink('PDF').getAttribute('href')));
        expect(view?.status(), "the file's view page opens").toBe(200);

        // Leaving the terms window (Fields, the terms window).
        let terms = await pf.openTerms('EPUB', 'replacement.pdf');
        await expect(terms.radio(SALES.openAccess)).toBeChecked();
        await terms.choose(SALES.notAvailable);
        const asked = mg.seen.length;
        await terms.cancel();
        expect(mg.seen.slice(asked), '"Cancel" asked nothing').toEqual([]);
        const epubFile = pf.fileRow('EPUB', 'replacement.pdf');
        await expect(pf.rowLink(epubFile, 'Open Access')).toBeVisible();
        terms = await pf.openTerms('EPUB', 'replacement.pdf');
        await terms.choose(SALES.notAvailable);
        mg.answers.push('dismiss');
        await terms.closeArrow().click();
        await expect.poll(() => mg.seen.length, {timeout: 30_000}).toBe(asked + 1);
        expect(mg.seen[asked]).toEqual({type: 'confirm', message: TEXT.formChanged});
        await expect(terms.dialog()).toHaveCount(1);
        await expect(terms.radio(SALES.notAvailable)).toBeChecked();
        mg.answers.push('accept');
        await terms.closeArrow().click();
        await terms.expectClosed();
        expect(mg.seen.slice(asked + 1)).toEqual([{type: 'confirm', message: TEXT.formChanged}]);
        await expect(pf.rowLink(epubFile, 'Open Access')).toBeVisible();

        // A file set "Not Available" (Rules 15c, 15d): the book's page drops "EPUB".
        terms = await pf.openTerms('EPUB', 'replacement.pdf');
        await terms.choose(SALES.notAvailable);
        await terms.save();
        await expect(pf.rowLink(epubFile, 'Not Available')).toBeVisible({timeout: 30_000});
        await reader.goto(book.submissionId);
        await expect(reader.links()).toHaveText([exactly('PDF')]);

        // "PDF" withdrawn (Rule 14; A11: the window's sentence unread).
        const pdf = pf.formatRow('PDF');
        await (await pf.openStatus(pdf, 'Available', 'Format Availability')).ok();
        await expect(pf.rowLink(pdf, 'Not Available')).toBeVisible({timeout: 30_000});
        await reader.goto(book.submissionId);
        await expect(reader.links()).toHaveCount(0);
        await expect(reader.fileLink('PDF')).toHaveCount(0);

        // Approval revoked (Rule 12).
        const approval = await pf.openStatus(pdf, 'Approved', 'Format Approval');
        await expect(approval.text(TEXT.formatUnapprove)).toBeVisible();
        await approval.ok();
        await expect(pf.rowLink(pdf, 'Awaiting Approval')).toBeVisible({timeout: 30_000});

        // Available while awaiting approval (Rule 14): the book's page lists "PDF" again.
        await (await pf.openStatus(pdf, 'Not Available', 'Format Availability')).ok();
        await expect(pf.rowLink(pdf, 'Available')).toBeVisible({timeout: 30_000});
        await expect(pf.rowLink(pdf, 'Awaiting Approval')).toBeVisible();
        await reader.goto(book.submissionId);
        await expect(reader.links()).toHaveText([exactly('PDF')]);

        // Control: the Author's view of the published version (Rules 3, 16).
        const au = await pageAs(asUser, AUTHOR);
        const auPf = new PublicationFormatsPage(au.page, PRESS, {appContext});
        await auPf.gotoAuthor(book.submissionId, book.publicationId);
        await expect(auPf.mainText(TEXT.publishedAuthor)).toBeVisible();
        await expectSet(auPf.formatLabels(), [`PDF${DEFAULT_KIND}`, `EPUB${DEFAULT_KIND}`]);
        await expect(auPf.addLink()).toHaveCount(0);
        await expect(auPf.statusLinks()).toHaveCount(0);
    });

    test("S6: A file's terms and its price", async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s6', testInfo);
        // Given: a scratch press taking payments in US Dollars with "Manual
        // Fee Payment", its book in Production with "PDF" and no file.
        const press = await scratchPress(ompApi, tag, {
            payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment'},
        });
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            publicationFormats: [format('PDF')],
        });
        const {page} = await pageAs(asUser, press.mg.username);
        const pf = new PublicationFormatsPage(page, press.path, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);

        // A file with no terms (Rule 9).
        await pf.uploadWithChangeFile('PDF', ARTICLE);
        const file = pf.fileRow('PDF', 'article.pdf');
        await expect(pf.rowLink(file, 'Set Terms')).toBeVisible({timeout: 30_000});

        // "Set Terms for Downloading" (Fields, the terms window; Rule 15a; Settings bullet 5).
        let terms = await pf.openTerms('PDF', 'article.pdf');
        await expect(terms.text(TEXT.termsIntro)).toBeVisible();
        expect(await terms.choiceLabels()).toEqual(['Open Access', 'Direct Sales', 'Not Available']);
        await expect(terms.radio(SALES.notAvailable)).toBeChecked();
        await expect(terms.priceLabel()).toHaveText(exactly('Price (USD)'));
        await expect(terms.priceBox()).toBeDisabled();
        await expect(terms.text(TEXT.priceHelp)).toBeVisible();
        await expect(terms.cancelLink()).toBeVisible();
        await expect(terms.saveButton()).toBeVisible();

        // Saved unchanged: "Not Available" (Rule 15a).
        await terms.save();
        await expect(pf.rowLink(file, 'Not Available')).toBeVisible({timeout: 30_000});

        // A price refused (Rule 15b).
        terms = await pf.openTerms('PDF', 'article.pdf');
        await terms.choose(SALES.directSales);
        await expect(terms.priceBox()).toBeEditable();
        await expect(terms.saveButton()).toBeDisabled();
        await terms.typePrice('abc');
        await expect(terms.saveButton()).toBeDisabled();
        await terms.typePrice('-5');
        await expect(terms.saveButton()).toBeEnabled();
        const refused = await terms.pressSave();
        expect(refused.ok()).toBe(true);
        await expect(terms.errorBlock()).toBeVisible({timeout: 30_000});
        await expect(terms.priceLabel()).toHaveText(exactly(TEXT.priceRefused));
        await expect(terms.dialog()).toHaveCount(1);
        await terms.cancel();
        await expect(pf.rowLink(file, 'Not Available')).toBeVisible();

        // "Direct Sales" at 25.00 (Rules 15a, 15b, 15d).
        terms = await pf.openTerms('PDF', 'article.pdf');
        await terms.choose(SALES.directSales);
        await terms.typePrice('25.00');
        await terms.save();
        await expect(pf.rowLink(file, 'Direct Sales')).toBeVisible({timeout: 30_000});
        terms = await pf.openTerms('PDF', 'article.pdf');
        await expect(terms.radio(SALES.directSales)).toBeChecked();
        await expect(terms.priceBox()).toHaveValue('25.00');

        // "Open Access": the box greys, still reading 25.00 (Rules 15c, 15d).
        await terms.choose(SALES.openAccess);
        await expect(terms.priceBox()).toBeDisabled();
        await expect(terms.priceBox()).toHaveValue('25.00');
        await terms.save();
        await expect(pf.rowLink(file, 'Open Access')).toBeVisible({timeout: 30_000});
        terms = await pf.openTerms('PDF', 'article.pdf');
        await expect(terms.radio(SALES.openAccess)).toBeChecked();
        await terms.cancel();

        // Control: a press with no payment settings reads "Price ()" (Settings bullet 5).
        const bare = await scratchPress(ompApi, `${tag}x`);
        const bareBook = await seedBook(ompApi, `${tag}xb`, {
            context: bare.path,
            submitter: bare.au.username,
            publicationFormats: [format('PDF', 'article.pdf')],
        });
        const second = await pageAs(asUser, bare.mg.username);
        const barePf = new PublicationFormatsPage(second.page, bare.path, {appContext});
        await barePf.gotoEditorial(bareBook.submissionId, bareBook.publicationId);
        const bareTerms = await barePf.openTerms('PDF', 'article.pdf');
        await expect(bareTerms.radio(SALES.openAccess)).toBeChecked();
        await expect(bareTerms.priceLabel()).toHaveText(exactly('Price ()'));
    });

    test('S7: A remote format', async ({page, asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s7', testInfo);
        // Given: a published book with "PDF" holding article.pdf (footnote s).
        const book = await seedBook(ompApi, tag, {published: true, publicationFormats: [format('PDF', 'article.pdf')]});
        const mgContext = await asUser(MANAGER);
        // The remote address is answered in the browser: no test reaches example.org.
        await mgContext.route('https://example.org/**', (route) => route.fulfill({status: 200, contentType: 'text/html', body: '<p>web copy</p>'}));
        const mgPage = await mgContext.newPage();
        watchDialogs(mgPage);
        const pf = new PublicationFormatsPage(mgPage, PRESS, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);

        // The remote box (Fields, the format window).
        const win = await pf.openAdd();
        await win.type(win.urlPathBox(), 'web-copy');
        await win.remoteBox().check();
        await expect(win.remoteUrlBox()).toBeVisible();
        await expect(win.urlPathBox()).toBeHidden();
        await win.remoteBox().uncheck();
        await expect(win.urlPathBox()).toBeVisible();
        await expect(win.urlPathBox()).toHaveValue('');
        await win.remoteBox().check();
        await expect(win.remoteUrlBox()).toBeVisible();

        // "Web" saved (Rules 4, 5).
        await win.typeName('Web');
        await win.type(win.remoteUrlBox(), 'https://example.org/web-copy');
        await win.ok();
        const web = pf.formatRow('Web');
        await expect(pf.formatLabel('Web')).toHaveText(exactly(`Web${DEFAULT_KIND}`), {timeout: 30_000});
        await expect(pf.rowLink(web, 'Awaiting Approval')).toBeVisible();
        await expect(pf.rowLink(web, 'Not Available')).toBeVisible();
        await expect(pf.remoteLink('Web')).toHaveAttribute('href', 'https://example.org/web-copy');
        await expect(pf.lineUnder('Web')).toHaveText(exactly(TEXT.remote));
        await expect(pf.rowLink(web, 'Change File')).toHaveCount(0);
        await expect(pf.rowLink(web, 'Select Files')).toHaveCount(0);
        const [tab] = await Promise.all([mgPage.waitForEvent('popup', {timeout: 30_000}), pf.remoteLink('Web').click()]);
        await tab.waitForURL('https://example.org/web-copy', {waitUntil: 'commit'});
        await closeTab(tab);
        // Visitor: the book's page lists no "Web" (its control, "PDF", listed).
        const reader = new BookFormats(page, PRESS);
        await reader.goto(book.submissionId);
        await expect(reader.links()).toHaveText([exactly('PDF')]);
        await expect(reader.remoteLink('Web')).toHaveCount(0);

        // Made available (Rule 14): the book's page links "Web" to its address.
        await (await pf.openStatus(web, 'Not Available', 'Format Availability')).ok();
        await expect(pf.rowLink(web, 'Available')).toBeVisible({timeout: 30_000});
        await reader.goto(book.submissionId);
        await expect(reader.remoteLink('Web')).toHaveAttribute('href', 'https://example.org/web-copy');
        await expectSet(reader.links(), ['PDF', 'Web']);

        // Control: "PDF", not remote, still shows both file links (Rule 5).
        const pdf = pf.formatRow('PDF');
        await expect(pf.rowLink(pdf, 'Change File')).toBeVisible();
        await expect(pf.rowLink(pdf, 'Select Files')).toBeVisible();
    });

    test('S8: A format edited, its URL Path refused, and the format deleted', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s8', testInfo);
        const press = await scratchPress(ompApi, tag);
        // Given: article.pdf among the book's files, the chapter "Tides",
        // "PDF" holding replacement.pdf (footnote s).
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            files: [{file: 'article.pdf'}],
            chapters: [{title: 'Tides'}],
            publicationFormats: [format('PDF', 'replacement.pdf')],
        });
        const {page, seen, answers} = await pageAs(asUser, press.mg.username);

        // The chapter's "Files" offers replacement.pdf (Side effects, "Files deleted").
        const chapters = new ChaptersPage(page, press.path, {appContext});
        await chapters.gotoEditorial(book.submissionId, book.publicationId);
        let tides = await chapters.list.openEdit('Tides');
        await expect(tides.fileBox('replacement.pdf')).toHaveCount(1);
        await expect(tides.fileBox('article.pdf')).toHaveCount(1);
        await tides.cancel();

        // Leaving without saving (Rule 4a).
        const pf = new PublicationFormatsPage(page, press.path, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);
        let win = await pf.openAdd();
        await win.typeName('EPUB');
        let asked = seen.length;
        await win.cancel();
        expect(seen.slice(asked), '"Cancel" asked nothing').toEqual([]);
        await expect(pf.formatRow('PDF')).toHaveCount(1);
        await expect(pf.formatRow('EPUB')).toHaveCount(0);
        win = await pf.openAdd();
        await win.typeName('EPUB');
        asked = seen.length;
        answers.push('dismiss');
        await win.closeArrow().click();
        await expect.poll(() => seen.length, {timeout: 30_000}).toBe(asked + 1);
        expect(seen[asked]).toEqual({type: 'confirm', message: TEXT.formChanged});
        await expect(win.nameBox()).toHaveValue('EPUB');
        answers.push('accept');
        await win.closeArrow().click();
        await win.expectClosed();
        expect(seen.slice(asked + 1)).toEqual([{type: 'confirm', message: TEXT.formChanged}]);
        await pf.reload();
        await expect(pf.formatRow('PDF')).toHaveCount(1);
        await expect(pf.formatRow('EPUB')).toHaveCount(0);

        // "URL Path" refused (Rule 6).
        win = await pf.openEdit('PDF');
        await win.type(win.urlPathBox(), 'my pdf');
        await win.okRefused(win.urlPathError());
        await win.type(win.urlPathBox(), 'a/b');
        await win.okRefused(win.urlPathError());

        // A tab switch with a change (Rules 4a, 8).
        await win.typeName('Print');
        asked = seen.length;
        answers.push('dismiss');
        await win.tab('Metadata').click();
        await expect.poll(() => seen.length, {timeout: 30_000}).toBe(asked + 1);
        expect(seen[asked]).toEqual({type: 'confirm', message: TEXT.formChanged});
        await expect(win.tab('Edit')).toHaveAttribute('aria-selected', 'true');
        await expect(win.nameBox()).toHaveValue('Print');

        // Edited (Rules 6, 8): the row renamed and re-kinded. The "no
        // notice" half is not read here: after the two refusals above this
        // "OK" shows each refusal's message as a notice (A24).
        await win.kindList().selectOption({label: 'Paperback / softback (BC)'});
        await win.type(win.urlPathBox(), 'print-edition');
        await win.ok();
        await expect(pf.formatLabel('Print')).toHaveText(exactly('PrintPaperback / softback (BC)'), {timeout: 30_000});
        win = await pf.openEdit('Print');
        await expect(win.nameBox()).toHaveValue('Print');
        await expect(win.kindChosen()).toHaveText(exactly('Paperback / softback (BC)'));
        await expect(win.urlPathBox()).toHaveValue('print-edition');
        await win.cancel();

        // Delete cancelled (Rule 20).
        let del = await pf.openDelete('Print');
        await expect(del.question()).toBeVisible();
        await expect(del.buttons()).toHaveText([exactly('OK'), exactly('Cancel')]);
        await del.cancel();
        await expect(pf.formatRow('Print')).toHaveCount(1);
        await expect(pf.fileRow('Print', 'replacement.pdf')).toHaveCount(1);

        // Deleted (Rule 20; Side effects, "Notices").
        del = await pf.openDelete('Print');
        await expectNotice(page, TEXT.removed, () => del.ok());
        await expect(pf.formatBodies()).toHaveCount(0, {timeout: 30_000});
        await expect(pf.emptyList()).toHaveText(exactly(TEXT.noItems));
        await expect(pf.grid().locator('a.pkp_linkaction_downloadFile')).toHaveCount(0);

        // Control: the chapter's "Files" no longer offers replacement.pdf.
        await chapters.gotoEditorial(book.submissionId, book.publicationId);
        tides = await chapters.list.openEdit('Tides');
        await expect(tides.fileBox('article.pdf')).toHaveCount(1);
        await expect(tides.fileBox('replacement.pdf')).toHaveCount(0);
    });

    test('S9: A new version copies the formats', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s9', testInfo);
        // Given: a published book, "PDF" Approved and Available, article.pdf
        // "Awaiting Approval" on "Open Access" (footnote s).
        const book = await seedBook(ompApi, tag, {published: true, publicationFormats: [format('PDF', 'article.pdf')]});
        const {page} = await pageAs(asUser, MANAGER);
        const pf = new PublicationFormatsPage(page, PRESS, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);

        // "Create New Version": the new version's page carries the copy (Rule 21).
        const second = await createNewVersion(page);
        await pf.gotoEditorial(book.submissionId, second);
        const pdf = pf.formatRow('PDF');
        await expect(pf.formatLabel('PDF')).toHaveText(exactly(`PDF${DEFAULT_KIND}`));
        await expect(pf.rowLink(pdf, 'Approved')).toBeVisible();
        await expect(pf.rowLink(pdf, 'Available')).toBeVisible();
        const file = pf.fileRow('PDF', 'article.pdf');
        await expect(pf.rowLink(file, 'Awaiting Approval')).toBeVisible();
        await expect(pf.rowLink(file, 'Open Access')).toBeVisible();

        // The copy renamed (Rules 8, 21).
        const win = await pf.openEdit('PDF');
        await win.typeName('PDF second edition');
        await win.ok();
        await expect(pf.formatLabel('PDF second edition')).toHaveText(exactly(`PDF second edition${DEFAULT_KIND}`), {timeout: 30_000});

        // Control: the first version still lists "PDF" alone (Rules 2, 21).
        await pf.openVersionFromMenu(0);
        await expect(pf.formatLabels()).toHaveText([exactly(`PDF${DEFAULT_KIND}`)]);
        await expect(pf.formatRow('PDF second edition')).toHaveCount(0);
    });

    test('S10: A press with DOIs switched off records a format\'s DOI', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s10', testInfo);
        // Given: a scratch press with DOIs off, its book in Production with "PDF".
        const press = await scratchPress(ompApi, tag, {enableDois: false});
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            publicationFormats: [format('PDF')],
        });
        const {page} = await pageAs(asUser, press.mg.username);
        const pf = new PublicationFormatsPage(page, press.path, {appContext});
        await pf.gotoEditorial(book.submissionId, book.publicationId);

        // "DOI (06)" offered (Settings bullet 4; Rule 18a).
        const win = await pf.openEdit('PDF');
        const meta = await win.openMetadata();
        let code = await meta.openAddCode();
        await expect(code.typeOptions().filter({hasText: exactly('DOI (06)')})).toHaveCount(1);

        // A DOI code (Rule 18).
        await code.typeList().selectOption({label: 'DOI (06)'});
        await code.valueBox().fill('10.1234/pdf-copy');
        await expectNotice(page, TEXT.codeAdded, () => code.ok());
        await meta.expectRowCells(LISTS.codes, '10.1234/pdf-copy', ['10.1234/pdf-copy', 'DOI (06)']);

        // Control: "DOI (06)" no longer offered, the other types still are (Rule 18a).
        code = await meta.openAddCode();
        await expect(code.typeOptions().filter({hasText: exactly('ISBN-13 (15)')})).toHaveCount(1);
        await expect(code.typeOptions().filter({hasText: exactly('DOI (06)')})).toHaveCount(0);
    });

    test('S11: No publication formats on a journal or a preprint server: the absence, its press control', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s11', testInfo);
        // Given (the press side): the Press manager's book in Production.
        const book = await seedBook(ompApi, tag);
        const {page} = await pageAs(asUser, MANAGER);
        const frame = new WorkflowPage(page, PRESS, {appContext});
        await frame.gotoEditorial(book.submissionId);

        // Control: "Publication" › the version lists "Publication Formats"
        // (Actors), and no "Galleys"; the page opens.
        const pages = await frame.pagesUnderLatestVersion();
        expect(pages).toContain('Publication Formats');
        expect(pages).not.toContain('Galleys');
        const pf = new PublicationFormatsPage(page, PRESS, {appContext});
        await pf.openFromMenu();
        await expect(pf.emptyList()).toHaveText(exactly(TEXT.noItems));
    });
});

