// @ts-check
/**
 * @file playwright/tests/U45-dois.spec.js
 *
 * DOIs — OMP suite, one test per canonical scenario the spec runs on a
 * press (S1–S11 common, S19 {OMP}; S12–S18 are the journal's and the
 * preprint server's), in the press's own words: the Press Manager, a
 * monograph, the "Monographs" tab and its "Monograph" row, the catalog
 * book page, the "Publish" button whose window is titled "Schedule For
 * Publication". The journal-only bullets inside the common scenarios
 * (galley rows, issues, the "Issues" filter box, S8's issue pattern) have
 * no press leg here; the press's own legs ride in them: S3's "Publication
 * Status" filters, S4's file row "PDF / article.pdf", and the chapter and
 * format rows of S4, S5, S7 and S9–S11 ("Tides" with its page, "Harbours"
 * without, "Format / PDF", "Format / EPUB"), with the book page's and the
 * chapter page's DOI lines (Rules 45–54). Everything runs in
 * the parallel `omp` project: the DOI settings are per scratch press, and
 * a press on "DOI Versioning" "Yes" (S11) leaves the install's OAI alone
 * (the failure of U19 A22 is the journal's).
 * Spec: docs/specs/U45-dois.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A3 🐞: S7's refused values are read as the notice and the box back to
 *   its old value; the missing reason is not asserted.
 * - A8 🐞: rows' tick boxes are reached by their place in the row; their
 *   missing name is not asserted.
 * - A14 🐞: S9 reads the "Mark DOIs Needs Sync" question up to "…previously
 *   submitted DOIs."; its "stale" sentence is not asserted.
 * - OMP1 🐞: S4 reads the file row with "Monographs" ticked beside
 *   "Files"; "Files" alone and the "Needs DOI" filter's count of a missing
 *   file DOI are not asserted.
 * - OMP3 ❓: S4 reads "Harbours" (no page) greyed, empty and with the note
 *   under the table; its "Needs DOI" badge is not asserted.
 * - A21 🐞: S19's "Registration" "Save" is read as "Saved"; the server
 *   log's warning is not a screen.
 * - A22 🐞: `DoisPage.chooseBulkAction` waits the "Bulk Actions" menu out
 *   before answering a window; the menu left open is not asserted.
 * - OMP2 🐞, A1, A2, A4–A7, A9–A13, A15–A20: not on these scenarios' press
 *   paths. OJS1–OJS3, OPS1–OPS5: the journal's and the preprint server's.
 *
 * Seeding: scenario endpoints only; publicknowledge is read, never
 * changed (S1). Every other scenario seeds its own scratch press with
 * throwaway accounts (the username twice as password), as footnote sc
 * says: `doiPrefix`, `doiCreationTime`, `doiSuffixType`, `doiVersioning`,
 * `enabledDoiTypes` (`chapter` and `representation` in S4, S5, S7, S9–S11,
 * `file` in S4), `context.acronym` (S8), the editor's `permitSettings:
 * false` (S2); works through the submission scenario (`decisions[]`,
 * `published`, `chapters[]` "Tides" with `page: true` and "Harbours"
 * without, `publicationFormats[]` "PDF" with `article.pdf` and in S5 "EPUB"
 * with `approved: false`). The DOI settings are driven on screen only where
 * the scenario tests them; "Harbours"' "Chapter Page" (S4, S5) and S4's
 * "EPUB" are set on screen, as the scenarios say. A DOI typed by hand carries the run's tag after
 * the spec's example value ("10.1234/e2e-a1-{tag}"): a typed DOI must be
 * unused on the whole install (Rule 9), and the fleet's database outlives
 * a run.
 *
 * Every absence is read settled (the list's own fetch, the action's
 * answer, the page's own heading) and paired with a positive control
 * taken the same way (M4, M6); the mail catcher's silence is bounded by a
 * password-reset message sent to the press's own manager after the
 * actions (A8). Waits are web-first or bounded by the screen's own answer
 * (A5).
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ActivityLogWindow} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {
    DOIS_TEXT: TEXT,
    DoiSettings,
    DoisPage,
    recordNotices,
    defaultDoiPattern,
    isListFetch,
    sideMenuEntry,
    expectSideMenu,
    openDoisFromSideMenu,
    readerDoiItem,
    readerDoiLink,
    readerFormatDoiLinks,
    readerFormatDoiLabel,
} = require('../../../../shared/playwright/pages/DoisPages.js');
const {openEditorial, decisionButton, walkDecisionWizard, expectStageLabel} = require('../pages/ReviewStagePages.js');
const {ChaptersPage} = require('../pages/ChapterPages.js');
const {PublicationFormatsPage} = require('../pages/PublicationFormatPages.js');
const {MonographLandingPage} = require('../pages/MonographLandingPages.js');

const PRESS = 'publicknowledge';
const PREFIX = '10.1234';
const MADE = defaultDoiPattern(PREFIX);
const MONOGRAPH = 'Monograph';
const FILE_ROW = 'PDF / article.pdf';
const TIDES = 'Tides';
const HARBOURS = 'Harbours';
const FORMAT_PDF = 'Format / PDF';
const FORMAT_EPUB = 'Format / EPUB';
/** "Monographs", "Chapters" and "Publication Formats" ticked (scenarios 5, 7, 9–11). */
const BOOK_KINDS = ['publication', 'chapter', 'representation'];
/** The chapter "Tides" with its "Chapter Page" ticked. */
const TIDES_SEED = {title: TIDES, page: true};
const AXOLOTL = 'Axolotl limb memory';
const TARDIGRADE = 'Tardigrade desiccation';
const CORAL = 'Coral spawning';
const KINDS = ['Monographs', 'Chapters', 'Publication Formats', 'Files'];
const PATTERN_BOXES = ['Submissions', 'Chapters', 'Publication Formats', 'Files'];
const ENABLE_SENTENCE = 'Allow Digital Object Identifiers (DOIs) to be assigned to work published by this press.';
const COPYEDIT = 'Upon reaching the copyediting stage';
const PUBLICATION = 'Upon publication';
const NEVER = 'Never';
const METADATA_EVENT = 'Submission metadata updated';
const TO_PRODUCTION = ['skipExternalReview', 'sendToProduction'];
const MARK_ACTIONS = ['Mark DOIs Registered', 'Mark DOIs Unregistered', 'Mark DOIs Needs Sync', 'Assign DOIs'];

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u45${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/**
 * Seed a scratch press with a throwaway Press Manager ("Mona Manager") and
 * the Authors "Ada Lovelace" and "Mary Anning", plus `extra` accounts; the
 * other keys go to the context scenario as given.
 */
async function seedPress(ompApi, tag, {extra = [], ...keys} = {}) {
    const users = [
        user(`${tag}mg`, 'Mona', 'Manager', ['manager']),
        user(`${tag}al`, 'Ada', 'Lovelace', ['author']),
        user(`${tag}ma`, 'Mary', 'Anning', ['author']),
        ...extra,
    ];
    await ompApi.createContext({tag, users, ...keys});
    return {manager: `${tag}mg`, ada: `${tag}al`, mary: `${tag}ma`};
}

/** Seed a monograph on the scratch press `tag`. */
async function seedBook(ompApi, tag, key, submitter, title, rest = {}) {
    return ompApi.createSubmission({tag: `${tag}${key}`, context: tag, submitter, title, ...rest});
}

/** A page as `username`, every browser dialog accepted, the top-right notices recorded. */
async function pageAs(asUser, username) {
    const page = await (await asUser(username)).newPage();
    page.on('dialog', (dialog) => {
        dialog.accept().catch(() => {});
    });
    await recordNotices(page);
    return page;
}

/** A signed-out reader page (an explicit empty state, patterns.md lesson 8). */
async function readerPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    return context.newPage();
}

/** The "https://doi.org/{doi}" address a reader page shows. */
const resolving = (doi) => `https://doi.org/${doi}`;

/** Read a DOI box's value once it holds one matching `pattern`. */
async function doiValue(box, pattern = MADE) {
    await expect(box).toHaveValue(pattern, {timeout: 30_000});
    return box.inputValue();
}

/**
 * The catalog book page signed out (a version's page with `version`): its
 * "DOI:" line reads `doi`, or (null) it has none, the page's title heading
 * being the positive control either way.
 */
async function expectBookDoi(reader, tag, submissionId, title, doi, {version} = {}) {
    const suffix = version === undefined ? '' : `/version/${version}`;
    const response = await reader.goto(`/index.php/${tag}/catalog/book/${submissionId}${suffix}`);
    expect(response?.status(), 'the book page answers').toBe(200);
    await expect(reader.locator('h1.title')).toHaveText(new RegExp(`^\\s*${title}\\s*$`));
    if (doi === null) {
        await expect(readerDoiItem(reader)).toHaveCount(0);
        return;
    }
    await expect(readerDoiItem(reader)).toHaveCount(1);
    await expect(readerDoiItem(reader).locator('.label')).toHaveText(/^\s*DOI:\s*$/);
    await expect(readerDoiLink(reader)).toHaveText(resolving(doi));
    await expect(readerDoiLink(reader)).toHaveAttribute('href', resolving(doi));
}

/** Open a version's "Title & Abstract" page on the workflow (its publishing controls on top). */
async function openVersion(page, tag, submissionId, publicationId) {
    const frame = new WorkflowPage(page, tag);
    await frame.gotoEditorial(submissionId, {menuKey: `publication_${publicationId}_titleAbstract`});
    await frame.expectPageHeading('Title & Abstract');
    await frame.expectVersionLoaded();
    return frame;
}

/**
 * Publish the version open on the workflow: "Publish", its window
 * ("Schedule For Publication" on a press), the window's "Publish"; bounded
 * by the publish request and the "Unpublish" that replaces the button.
 */
async function publishOpenVersion(page) {
    await page.getByRole('button', {name: 'Publish', exact: true}).click();
    const modal = page.getByRole('dialog', {name: /Schedule For Publication/});
    await expect(modal).toBeVisible({timeout: 30_000});
    const published = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: 30_000});
    await modal.getByRole('button', {name: 'Publish', exact: true}).click();
    expect((await published).ok(), 'the publish answers').toBe(true);
    await expect(page.getByRole('button', {name: 'Unpublish', exact: true})).toBeVisible({timeout: 30_000});
}

/** Unpublish the version open on the workflow through its confirmation. */
async function unpublishOpenVersion(page) {
    await page.getByRole('button', {name: 'Unpublish', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Unpublish'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    const unpublished = page.waitForResponse((r) => /\/publications\/\d+\/unpublish/.test(r.url()) && r.request().method() !== 'GET', {timeout: 30_000});
    await dialog.getByRole('button', {name: 'Unpublish', exact: true}).click();
    expect((await unpublished).ok(), 'the unpublish answers').toBe(true);
    await expect(page.getByRole('button', {name: 'Publish', exact: true})).toBeVisible({timeout: 30_000});
}

/**
 * "Create New Version" on the workflow open, its "Revision Significance"
 * chosen when `significance` is given ("Major Revision", "Minor
 * Revision"); returns the new version's publication id.
 */
async function createVersion(page, frame, significance = null) {
    const item = await frame.revealPublicationEntry('Create New Version');
    await frame.expectVersionLoaded();
    await item.click();
    const dialog = page.getByRole('dialog', {name: 'Create New Version'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    await expect(dialog.getByLabel('Publication Stage')).toHaveValue('VoR', {timeout: 30_000});
    if (significance) await dialog.getByLabel('Revision Significance').selectOption({label: significance});
    const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000});
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const response = await created;
    expect(response.ok(), 'the new version is made').toBe(true);
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    return (await response.json()).id;
}

/**
 * The Activity Log's lines of `event` (every line with `null`), read on the
 * work's workflow and the window closed.
 */
async function activityLines(page, tag, submissionId, event = METADATA_EVENT) {
    const frame = new WorkflowPage(page, tag);
    await frame.gotoEditorial(submissionId);
    const log = new ActivityLogWindow(page, frame);
    await log.open();
    const lines = (await log.historyLines()).filter((l) => event === null || l.event === event);
    await log.close();
    return lines;
}

/** How many of `lines` are the throwaway Press Manager's ("Mona Manager"). */
const byManager = (lines) => lines.filter((l) => l.user === 'Mona Manager').length;

/**
 * The book page signed out (a version's page with `version`): the table of
 * contents' entry `chapter` shows a DOI line linking `doi` (Rule 54).
 */
async function expectTocDoi(reader, tag, submissionId, chapter, doi, {version} = {}) {
    const book = new MonographLandingPage(reader, tag);
    await book.goto(submissionId, version === undefined ? {} : {version});
    await expect(book.tocEntry(chapter)).toHaveCount(1);
    const link = book.tocDoi(chapter).locator('a');
    await expect(link).toHaveText(resolving(doi));
    await expect(link).toHaveAttribute('href', resolving(doi));
    return book;
}

/** Tick a chapter's "Chapter Page" in its "Edit Chapter" window on the version's "Chapters" page and save it. */
async function tickChapterPage(page, tag, submissionId, publicationId, title) {
    const chapters = new ChaptersPage(page, tag);
    await chapters.gotoEditorial(submissionId, publicationId);
    const win = await chapters.list.openEdit(title);
    await expect(win.chapterPageBox()).not.toBeChecked();
    await win.chapterPageBox().check();
    await win.save();
}

/**
 * The mail catcher's silence for `others`, bounded by a positive control:
 * a password reset for the press's own manager, asked on the press's
 * "Forgot your password?" page after the actions (A8). The manager's inbox
 * then holds that one message and nothing else.
 */
async function expectNoMailBesidesControl(browser, baseURL, pkpMail, tag, manager, others) {
    const visitor = await readerPage(browser, baseURL);
    await visitor.goto(`/index.php/${tag}/login/lostPassword`);
    await visitor.locator('form#lostPasswordForm input#email').fill(mailOf(manager));
    await visitor.locator('form#lostPasswordForm').getByRole('button', {name: 'Reset Password'}).click();
    await pkpMail.find({to: mailOf(manager), subject: 'Password Reset Confirmation'});
    expect(await pkpMail.count({to: mailOf(manager)}), 'the manager received the control alone').toBe(1);
    for (const other of others) {
        expect(await pkpMail.count({to: mailOf(other)}), `no mail to ${other}`).toBe(0);
    }
    await visitor.context().close();
}

test.describe('DOIs', () => {
    test('S1: who opens the DOIs page, on a press without a prefix', async ({browser, baseURL, asUser}) => {
        test.setTimeout(240_000);
        const manager = await pageAs(asUser, 'manager.maya');
        const dois = new DoisPage(manager, PRESS);

        // The Press Manager's DOIs page, from the side menu: headed "DOIs",
        // under the prefix warning; "Bulk Actions" offers no "Assign DOIs"
        // while it offers "Mark DOIs Registered" (Rules 2, 24).
        await manager.goto(`/index.php/${PRESS}/user/profile`);
        await expectSideMenu(manager);
        await expect(sideMenuEntry(manager, 'DOIs')).toHaveCount(1);
        await openDoisFromSideMenu(manager);
        await expect(manager).toHaveURL(new RegExp(`/index\\.php/${PRESS}(/en)?/dois`));
        await expect(dois.heading()).toBeVisible();
        await expect(dois.prefixWarning()).toHaveText(TEXT.prefixWarning, {useInnerText: true});
        await dois.expectListSettled();
        await dois.openBulkActions();
        await expect(dois.bulkItem('Mark DOIs Registered')).toBeVisible();
        await expect(dois.bulkItem('Assign DOIs')).toHaveCount(0);
        await dois.closeBulkActions();

        // "Add DOI prefix": Settings › Distribution › "DOIs" with the box and
        // "Monographs" ticked and "DOI Prefix" empty (Rule 2); left unsaved.
        const settings = new DoiSettings(manager, PRESS);
        await dois.addPrefixLink().click();
        await expect(manager).toHaveURL(/\/management\/settings\/distribution#dois/);
        await settings.openSideTab('Setup');
        await expect(settings.enableBox()).toBeChecked();
        await expect(settings.kindBox('Monographs')).toBeChecked();
        await expect(settings.prefixBox()).toHaveValue('');

        // The Editor: "DOIs" in the side menu; the page with "Bulk Actions"
        // and "Filters" (Actors row 2).
        const editor = await pageAs(asUser, 'editor.diana');
        await editor.goto(`/index.php/${PRESS}/user/profile`);
        await expectSideMenu(editor);
        await expect(sideMenuEntry(editor, 'DOIs')).toHaveCount(1);
        const editorDois = new DoisPage(editor, PRESS);
        await editorDois.goto();
        await expect(editorDois.bulkActionsButton()).toBeVisible();
        await expect(editorDois.filtersHeading()).toBeVisible();

        // Series Editor, Author, Reader: no "DOIs" in the side menu (its
        // other entries on screen), and the address answers the
        // access-denied page (Actors row 2).
        for (const username of ['sectioneditor.ana', 'author.alex', 'reader.rosa']) {
            const page = await pageAs(asUser, username);
            await page.goto(`/index.php/${PRESS}/user/profile`);
            await expectSideMenu(page);
            await expect(sideMenuEntry(page, 'Start A New Submission'), username).toHaveCount(1);
            await expect(sideMenuEntry(page, 'DOIs'), username).toHaveCount(0);
            await new DoisPage(page, PRESS).gotoExpectingDenied(TEXT.roleDenied);
        }

        // Signed out: the Login page (Actors row 2).
        const visitor = await readerPage(browser, baseURL);
        await new DoisPage(visitor, PRESS).gotoExpectingLogin();
        await visitor.context().close();

        // Control: the Press Manager again: the page opens (Actors row 2).
        await dois.goto();
        await expect(dois.heading()).toBeVisible();
        await expect(dois.listTitle()).toHaveText('Monograph DOIs');
    });

    test('S2: save a DOI prefix', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s2', testInfo);
        const {manager} = await seedPress(ompApi, tag, {
            extra: [user(`${tag}ed`, 'Edda', 'Editor', ['editor'])],
            roles: {editor: {permitSettings: false}},
        });
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);

        // Control: before the prefix is saved, the DOIs page opens under the
        // prefix warning and "Bulk Actions" offers no "Assign DOIs" (Rule 2).
        await dois.goto();
        await expect(dois.prefixWarning()).toHaveText(TEXT.prefixWarning, {useInnerText: true});
        await dois.openBulkActions();
        await expect(dois.bulkItem('Mark DOIs Registered')).toBeVisible();
        await expect(dois.bulkItem('Assign DOIs')).toHaveCount(0);
        await dois.closeBulkActions();

        // The "Setup" tab as it arrives (Fields).
        await settings.goto('Setup');
        await expect(settings.enableBox()).toBeChecked();
        await expect(settings.enableBox()).toHaveAccessibleName(ENABLE_SENTENCE);
        expect(await settings.kinds()).toEqual(KINDS.map((label, i) => ({label, checked: i === 0})));
        await expect(settings.prefixBox()).toHaveValue('');
        expect(await settings.creationTimeShown()).toBe(COPYEDIT);
        expect(await settings.creationTimeOptions()).toEqual([COPYEDIT, PUBLICATION, NEVER]);
        await expect(settings.formatRadio('Default - Automatically generates a unique eight-character suffix')).toBeChecked();
        await expect(settings.formatRadio('None')).not.toBeChecked();
        await expect(settings.versioningRadio('No')).toBeChecked();
        await expect(settings.versioningRadio('Yes')).not.toBeChecked();

        // No prefix: "Upon publication", "Save": refused under "DOI Prefix"
        // (Rule 3; A1).
        await settings.creationTimeSelect().selectOption({label: PUBLICATION});
        await settings.saveRefused(settings.setup, settings.prefixBox(), TEXT.prefixRequired);

        // A malformed prefix: "10.123", then "10.1234/" (Fields).
        await settings.prefixBox().fill('10.123');
        await settings.saveRefused(settings.setup, settings.prefixBox(), TEXT.notFormatted);
        await expect(settings.fieldError(settings.prefixBox())).not.toContainText(TEXT.prefixRequired);
        await settings.prefixBox().fill('10.1234/');
        await settings.saveRefused(settings.setup, settings.prefixBox(), TEXT.notFormatted);

        // Saved: "10.1234"; after a reload the prefix and "Upon publication"
        // are there (Fields; Rule 3).
        await settings.prefixBox().fill(PREFIX);
        await settings.save(settings.setup);
        await expect(settings.fieldError(settings.prefixBox())).toHaveCount(0);
        await settings.goto('Setup');
        await expect(settings.prefixBox()).toHaveValue(PREFIX);
        expect(await settings.creationTimeShown()).toBe(PUBLICATION);

        // The DOIs page: no prefix warning, "Assign DOIs" offered (Rules 2, 25).
        await dois.goto();
        await expect(dois.heading()).toBeVisible();
        await expect(dois.prefixWarning()).toHaveCount(0);
        await dois.openBulkActions();
        await expect(dois.bulkItem('Assign DOIs')).toBeVisible();
        await dois.closeBulkActions();

        // The Editor without Settings: "DOIs" in the side menu (no
        // "Settings" there), the page with "Bulk Actions" and "Filters"
        // (Actors row 2).
        const editor = await pageAs(asUser, `${tag}ed`);
        await editor.goto(`/index.php/${tag}/user/profile`);
        await expectSideMenu(editor);
        await expect(sideMenuEntry(editor, 'DOIs')).toHaveCount(1);
        await expect(sideMenuEntry(editor, 'Settings')).toHaveCount(0);
        const editorDois = new DoisPage(editor, tag);
        await editorDois.goto();
        await expect(editorDois.bulkActionsButton()).toBeVisible();
        await expect(editorDois.filtersHeading()).toBeVisible();
    });

    test('S3: the list: rows, search and filters', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const {manager, ada, mary} = await seedPress(ompApi, tag, {doiPrefix: PREFIX, doiCreationTime: 'publication'});
        const axolotl = await seedBook(ompApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedBook(ompApi, tag, 'ta', mary, TARDIGRADE, {decisions: ['skipExternalReview']});
        await seedBook(ompApi, tag, 'co', mary, CORAL);
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const both = [new RegExp(`— ${TARDIGRADE}$`), new RegExp(`— ${AXOLOTL}$`)];
        const onlyAxolotl = [new RegExp(`— ${AXOLOTL}$`)];
        const expectListed = async (patterns) => {
            await expect(dois.rowLink(dois.rows())).toHaveCount(patterns.length);
            const names = await dois.rowNames();
            expect(names.length).toBe(patterns.length);
            for (const pattern of patterns) expect(names.some((n) => pattern.test(n)), String(pattern)).toBe(true);
            expect(names.some((n) => n.endsWith(CORAL)), 'Coral spawning is never listed').toBe(false);
        };

        // The page: headed "DOIs", one tab "Monographs"; the list "Monograph
        // DOIs" with "Search" and "Bulk Actions" and no "Deposit All"; the
        // "Filters" column (Fields; Rule 14).
        await page.goto(`/index.php/${tag}/user/profile`);
        await openDoisFromSideMenu(page);
        await dois.expectListSettled();
        await expect(dois.tabs()).toHaveText(['Monographs']);
        await expect(dois.tab('Issues')).toHaveCount(0);
        await expect(dois.tabHeading()).toHaveText('Monographs');
        await expect(dois.listTitle()).toHaveText('Monograph DOIs');
        await expect(dois.searchBox()).toBeVisible();
        await expect(dois.bulkActionsButton()).toBeVisible();
        await expect(dois.depositAllButton()).toHaveCount(0);
        await expect(dois.filtersHeading()).toBeVisible();

        // Which works are listed: the published one and the one at
        // Copyediting, not the one at the Submission stage (Rule 15).
        await expectListed(both);

        // A published work's row (Rules 16, 17, 31).
        const axRow = dois.row(axolotl.submissionId);
        await expect(dois.rowCheckbox(axRow)).toBeVisible();
        await expect(dois.rowLink(axRow)).toHaveText(new RegExp(`^\\s*Lovelace — ${AXOLOTL}\\s*$`));
        await expect(dois.rowLink(axRow)).toHaveAttribute('target', '_blank');
        await expect(dois.rowLink(axRow)).toHaveAttribute('href', new RegExp(`/index\\.php/${tag}/catalog/book/${axolotl.submissionId}(/|$)`));
        await expect(dois.rowActions(axRow)).toContainText(String(axolotl.submissionId));
        await expect(dois.rowBadge(axRow)).toHaveText('Unregistered');
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.versionName(axRow)).toHaveText(/^\s*Version of Record 1\.0\s*$/);
        await expect(dois.columnHeaders(axRow)).toHaveText(TEXT.columns);
        expect(await dois.doiTypes(axRow)).toEqual([MONOGRAPH]);
        await expect(dois.doiBox(axRow, MONOGRAPH)).toHaveValue(new RegExp(`^${PREFIX.replace('.', '\\.')}/`));
        await expect(dois.doiBadge(axRow, MONOGRAPH)).toHaveText('Unregistered');
        await expect(dois.editButton(axRow)).toHaveText('Edit');

        // An unpublished work's row (Rules 16, 17, 31).
        const taRow = dois.row(tardigrade.submissionId);
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.doiBox(taRow, MONOGRAPH)).toHaveValue('');
        await expect(dois.doiBadge(taRow, MONOGRAPH)).toHaveText('Needs DOI');

        // Search: typing alone sends nothing and changes nothing; Enter
        // narrows; "Clear search phrase" brings the others back; "Anning"
        // finds the other work (Fields, "Search"; Rule 21).
        /** @type {string[]} */
        const phrases = [];
        page.on('request', (r) => {
            const phrase = r.url().includes('/api/v1/submissions?') ? new URL(r.url()).searchParams.get('searchPhrase') : null;
            if (phrase) phrases.push(phrase);
        });
        await dois.searchBox().fill('Axolotl');
        await expectListed(both);
        await dois.search('Axolotl');
        expect(phrases, 'only the Enter sent the phrase').toEqual(['Axolotl']);
        await expectListed(onlyAxolotl);
        await expect(dois.clearSearchButton()).toBeVisible();
        await dois.clearSearch();
        await expect(dois.searchBox()).toHaveValue('');
        await expectListed(both);
        await dois.search('Anning');
        await expectListed([new RegExp(`— ${TARDIGRADE}$`)]);
        await dois.clearSearch();
        await expectListed(both);

        // "Status" filters (Rule 22).
        await dois.pressFilter('Needs DOI');
        await expect(dois.clearFilterButton('Needs DOI')).toBeVisible();
        await expectListed([new RegExp(`— ${TARDIGRADE}$`)]);
        await dois.pressFilter('DOI Assigned');
        await expect(dois.clearFilterButton('DOI Assigned')).toBeVisible();
        await expect(dois.clearFilterButton('Needs DOI')).toHaveCount(0);
        await expectListed(onlyAxolotl);
        await dois.clearFilter('DOI Assigned');
        await expect(dois.clearFilterButton('DOI Assigned')).toHaveCount(0);
        await expectListed(both);

        // "Registration" filters (Rule 22).
        await dois.pressFilter('Unregistered');
        await expect(dois.clearFilterButton('Unregistered')).toBeVisible();
        await expectListed(onlyAxolotl);
        await dois.pressFilter('Unregistered');
        await expect(dois.clearFilterButton('Unregistered')).toHaveCount(0);
        await expectListed(both);

        // "Publication Status": "Unpublished" drops the published work;
        // lifted, then "Published" keeps it alone (Fields, "Filters").
        await dois.pressFilter('Unpublished');
        await expect(dois.clearFilterButton('Unpublished')).toBeVisible();
        await expectListed([new RegExp(`— ${TARDIGRADE}$`)]);
        await dois.pressFilter('Unpublished');
        await expect(dois.clearFilterButton('Unpublished')).toHaveCount(0);
        await expectListed(both);
        await dois.pressFilter('Published');
        await expect(dois.clearFilterButton('Published')).toBeVisible();
        await expectListed(onlyAxolotl);
    });

    test('S4: DOIs made at the move to Copyediting', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s4', testInfo);
        const {manager, mary} = await seedPress(ompApi, tag, {doiPrefix: PREFIX, enabledDoiTypes: [...BOOK_KINDS, 'file']});
        const tardigrade = await seedBook(ompApi, tag, 'ta', mary, TARDIGRADE, {
            publicationFormats: [{name: 'PDF', file: 'article.pdf'}],
            chapters: [TIDES_SEED, {title: HARBOURS}],
        });
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const logBefore = await activityLines(page, tag, tardigrade.submissionId);

        // Control: before the decision the DOIs page does not list the book
        // (Rule 15): the settled list shows its empty line.
        await dois.goto();
        await expect(dois.emptyLine()).toBeVisible();
        await expect(dois.row(tardigrade.submissionId)).toHaveCount(0);

        // The decision: "Accept and Skip Review" (Rule 5).
        const modal = await openEditorial(page, tag, tardigrade.submissionId);
        await expectStageLabel(modal, 'Submission');
        await decisionButton(modal, 'Accept and Skip Review').click();
        await expect(page.getByRole('heading', {level: 1, name: /Accept and Skip Review/})).toBeVisible({timeout: 30_000});
        await walkDecisionWizard(page);
        await expectStageLabel(await openEditorial(page, tag, tardigrade.submissionId), 'Copyediting');

        // The made DOI: listed "Unpublished"; its "Monograph" row holds a
        // "Default" DOI reading "Unregistered" (Rules 5, 6a, 15, 16, 32).
        await dois.goto();
        const row = dois.row(tardigrade.submissionId);
        await expect(dois.rowLink(row)).toHaveText(new RegExp(`— ${TARDIGRADE}\\s*$`));
        await expect(dois.rowBadge(row)).toHaveText('Unpublished');
        await dois.expand(row, tardigrade.submissionId);
        const bookDoi = await doiValue(dois.doiBox(row, MONOGRAPH));
        await expect(dois.doiBadge(row, MONOGRAPH)).toHaveText('Unregistered');

        // A press's file: "PDF / {file name}" with a DOI of the same shape,
        // different from the monograph's (Rules 4, 5, 6a, 17).
        const fileDoi = await doiValue(dois.doiBox(row, FILE_ROW));
        expect(fileDoi).not.toBe(bookDoi);

        // A press's chapters and format, in this order; "Tides" and "Format /
        // PDF" made and "Unregistered"; "Harbours" greyed without a DOI (its
        // "Needs DOI" is OMP3's, not asserted) and the note under the table;
        // after "Edit" its box refuses typing while "Tides"' takes it, and
        // "Save" with nothing changed closes the editing (Rules 18, 45, 47, 48).
        expect(await dois.doiTypes(row)).toEqual([MONOGRAPH, TIDES, HARBOURS, FORMAT_PDF, FILE_ROW]);
        const tidesDoi = await doiValue(dois.doiBox(row, TIDES));
        const formatDoi = await doiValue(dois.doiBox(row, FORMAT_PDF));
        expect(new Set([bookDoi, fileDoi, tidesDoi, formatDoi]).size, 'four different DOIs').toBe(4);
        await expect(dois.doiBadge(row, TIDES)).toHaveText('Unregistered');
        await expect(dois.doiBadge(row, FORMAT_PDF)).toHaveText('Unregistered');
        await dois.expectGreyed(row, TIDES, false);
        await dois.expectGreyed(row, HARBOURS);
        await expect(dois.doiBox(row, HARBOURS)).toHaveValue('');
        await expect(dois.chapterPageNote(row)).toBeVisible();
        await dois.startEditing(row);
        await expect(dois.doiBox(row, TIDES)).toBeEditable();
        await expect(dois.doiBox(row, HARBOURS)).toBeDisabled();
        expect(await dois.saveEditing(row, {expectRequests: false})).toEqual([]);
        await expect(dois.doiBox(row, TIDES)).toHaveJSProperty('readOnly', true);

        // The Activity Log: the decision added "Submission metadata updated"
        // under the Press Manager, who recorded it (Side effects).
        const logAfter = await activityLines(page, tag, tardigrade.submissionId);
        expect(logAfter.length, 'the decision logged the line').toBeGreaterThan(logBefore.length);
        expect(byManager(logAfter), 'a new line under the Press Manager').toBeGreaterThan(byManager(logBefore));

        // A page ticked and a format added after the move: "Harbours" plain,
        // the note gone, "Harbours" and "Format / EPUB" "Needs DOI" without a
        // DOI; the publish gives both theirs (Rules 47, 48).
        await tickChapterPage(page, tag, tardigrade.submissionId, tardigrade.publicationId, HARBOURS);
        const formats = new PublicationFormatsPage(page, tag);
        await formats.gotoEditorial(tardigrade.submissionId, tardigrade.publicationId);
        const add = await formats.openAdd();
        await add.typeName('EPUB');
        await add.ok();
        await expect(formats.formatRow('EPUB')).toHaveCount(1, {timeout: 30_000});
        await dois.goto();
        await dois.expand(row, tardigrade.submissionId);
        await expect(dois.doiLabel(row, FORMAT_EPUB)).toHaveCount(1);
        await dois.expectGreyed(row, HARBOURS, false);
        await expect(dois.chapterPageNote(row)).toHaveCount(0);
        await expect(dois.doiBox(row, TIDES)).toHaveValue(tidesDoi);
        for (const type of [HARBOURS, FORMAT_EPUB]) {
            await expect(dois.doiBox(row, type), type).toHaveValue('');
            await expect(dois.doiBadge(row, type), type).toHaveText('Needs DOI');
        }
        await openVersion(page, tag, tardigrade.submissionId, tardigrade.publicationId);
        await publishOpenVersion(page);
        await dois.goto();
        await dois.expand(row, tardigrade.submissionId);
        const harboursDoi = await doiValue(dois.doiBox(row, HARBOURS));
        const epubDoi = await doiValue(dois.doiBox(row, FORMAT_EPUB));
        expect(harboursDoi).not.toBe(epubDoi);
        await expect(dois.doiBox(row, TIDES)).toHaveValue(tidesDoi);
    });

    test('S5: DOIs made at publication', async ({browser, baseURL, asUser, ompApi}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s5', testInfo);
        const {manager, ada, mary} = await seedPress(ompApi, tag, {doiPrefix: PREFIX, doiCreationTime: 'publication', enabledDoiTypes: BOOK_KINDS});
        const axolotl = await seedBook(ompApi, tag, 'ax', ada, AXOLOTL, {
            decisions: TO_PRODUCTION,
            chapters: [TIDES_SEED, {title: HARBOURS}],
            publicationFormats: [
                {name: 'PDF', file: 'article.pdf'},
                {name: 'EPUB', file: 'replacement.pdf', approved: false},
            ],
        });
        const tardigrade = await seedBook(ompApi, tag, 'ta', mary, TARDIGRADE, {decisions: TO_PRODUCTION});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);

        // Before publishing: both "Unpublished"; the "Monograph" row empty
        // and "Needs DOI" (Rules 5, 17, 31).
        await dois.goto();
        const axRow = dois.row(axolotl.submissionId);
        const taRow = dois.row(tardigrade.submissionId);
        await expect(dois.rowBadge(axRow)).toHaveText('Unpublished');
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, MONOGRAPH)).toHaveValue('');
        await expect(dois.doiBadge(axRow, MONOGRAPH)).toHaveText('Needs DOI');

        // Published.
        const logBefore = await activityLines(page, tag, axolotl.submissionId);
        await openVersion(page, tag, axolotl.submissionId, axolotl.publicationId);
        await publishOpenVersion(page);

        // The made DOI: "Unregistered"; the "Monograph" row a "Default" DOI
        // (Rules 5, 6a, 17, 31).
        await dois.goto();
        await expect(dois.rowBadge(axRow)).toHaveText('Unregistered');
        await dois.expand(axRow, axolotl.submissionId);
        const bookDoi = await doiValue(dois.doiBox(axRow, MONOGRAPH));
        await expect(dois.doiBadge(axRow, MONOGRAPH)).toHaveText('Unregistered');

        // A press's chapters and formats: "Tides" and both formats made and
        // "Unregistered", "Harbours" greyed without a DOI (Rules 47, 48, 53).
        // Format rows follow the database order, so the set is compared.
        expect((await dois.doiTypes(axRow)).sort()).toEqual([MONOGRAPH, TIDES, HARBOURS, FORMAT_PDF, FORMAT_EPUB].sort());
        const tidesDoi = await doiValue(dois.doiBox(axRow, TIDES));
        const pdfDoi = await doiValue(dois.doiBox(axRow, FORMAT_PDF));
        const epubDoi = await doiValue(dois.doiBox(axRow, FORMAT_EPUB));
        expect(new Set([bookDoi, tidesDoi, pdfDoi, epubDoi]).size, 'four different DOIs').toBe(4);
        for (const type of [TIDES, FORMAT_PDF, FORMAT_EPUB]) {
            await expect(dois.doiBadge(axRow, type), type).toHaveText('Unregistered');
        }
        await dois.expectGreyed(axRow, TIDES, false);
        await dois.expectGreyed(axRow, HARBOURS);
        await expect(dois.doiBox(axRow, HARBOURS)).toHaveValue('');

        // The Activity Log: the publish added one "Submission metadata
        // updated" under the Press Manager, the chapters' and formats' DOIs
        // none (Side effects).
        const logPublished = await activityLines(page, tag, axolotl.submissionId);
        expect(logPublished.length, 'one line from the publish').toBe(logBefore.length + 1);
        expect(byManager(logPublished), 'the line is the Press Manager\'s').toBe(byManager(logBefore) + 1);

        // The reader's page: "DOI:" with the monograph's DOI as a link
        // (Rule 43; Actors row 4).
        const reader = await readerPage(browser, baseURL);
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, bookDoi);

        // The book's page: "Tides"' DOI line in the table of contents; "PDF"'s
        // details with its "DOI:"; "EPUB" a download link with no details
        // and no DOI; "Tides"' own page with its "DOI:" line (Rules 43, 53, 54).
        const book = await expectTocDoi(reader, tag, axolotl.submissionId, TIDES, tidesDoi);
        await expect(book.formatBlocks()).toHaveCount(1);
        const pdfBlock = book.formatBlock('PDF');
        await expect(pdfBlock).toHaveCount(1);
        await expect(readerFormatDoiLabel(pdfBlock)).toHaveText(/^\s*DOI:\s*$/);
        await expect(readerFormatDoiLinks(reader)).toHaveCount(1);
        await expect(pdfBlock.locator('.sub_item.pubid a')).toHaveText(resolving(pdfDoi));
        await expect(pdfBlock.locator('.sub_item.pubid a')).toHaveAttribute('href', resolving(pdfDoi));
        await expect(book.sideFileLink('PDF')).toHaveCount(1);
        await expect(book.sideFileLink('EPUB')).toHaveCount(1);
        await expect(book.formatBlock('EPUB')).toHaveCount(0);
        await expect(reader.getByText(resolving(epubDoi))).toHaveCount(0);
        await book.openChapter(TIDES);
        await expect(book.doiLabel()).toHaveText(/^\s*DOI:\s*$/);
        await expect(book.doiLink()).toHaveText(resolving(tidesDoi));
        await expect(book.doiLink()).toHaveAttribute('href', resolving(tidesDoi));
        await reader.context().close();

        // "Harbours" without its page: "Needs DOI" keeps the unpublished book
        // and not this one (Rule 51); "Assign DOIs" reports success and gives
        // "Harbours" nothing; no Activity Log line (Rule 47; Side effects).
        await dois.goto();
        await dois.pressFilter('Needs DOI');
        await expect(dois.row(tardigrade.submissionId)).toHaveCount(1);
        await expect(dois.row(axolotl.submissionId)).toHaveCount(0);
        await dois.pressFilter('Needs DOI');
        await expect(dois.clearFilterButton('Needs DOI')).toHaveCount(0);
        await expect(dois.row(axolotl.submissionId)).toHaveCount(1);
        const logAll = (await activityLines(page, tag, axolotl.submissionId, null)).length;
        await dois.goto();
        await dois.runBulk('Assign DOIs', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.assigned);
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, TIDES)).toHaveValue(tidesDoi);
        await dois.expectGreyed(axRow, HARBOURS);
        await expect(dois.doiBox(axRow, HARBOURS)).toHaveValue('');
        expect((await activityLines(page, tag, axolotl.submissionId, null)).length, 'no line from "Assign DOIs"').toBe(logAll);

        // "Harbours" given its page after the publish: plain, still without a
        // DOI, and now under "Needs DOI" (Rules 48, 51); "Assign DOIs" gives
        // it one, logging nothing (Rule 48; Side effects).
        await tickChapterPage(page, tag, axolotl.submissionId, axolotl.publicationId, HARBOURS);
        const logTicked = (await activityLines(page, tag, axolotl.submissionId, null)).length;
        await dois.goto();
        await dois.expand(axRow, axolotl.submissionId);
        await dois.expectGreyed(axRow, HARBOURS, false);
        await expect(dois.doiBox(axRow, HARBOURS)).toHaveValue('');
        await dois.pressFilter('Needs DOI');
        await expect(dois.row(axolotl.submissionId)).toHaveCount(1);
        await expect(dois.row(tardigrade.submissionId)).toHaveCount(1);
        await dois.pressFilter('Needs DOI');
        await expect(dois.clearFilterButton('Needs DOI')).toHaveCount(0);
        await dois.runBulk('Assign DOIs', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.assigned);
        await dois.expand(axRow, axolotl.submissionId);
        const harboursDoi = await doiValue(dois.doiBox(axRow, HARBOURS));
        expect(harboursDoi).not.toBe(tidesDoi);
        expect((await activityLines(page, tag, axolotl.submissionId, null)).length, 'no line from the second "Assign DOIs"').toBe(logTicked);

        // Control: the unpublished work still reads "Needs DOI" (Rule 5).
        await dois.goto();
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.doiBox(taRow, MONOGRAPH)).toHaveValue('');
        await expect(dois.doiBadge(taRow, MONOGRAPH)).toHaveText('Needs DOI');
    });

    test('S6: "Never", then "Assign DOIs"; DOIs switched off', async ({browser, baseURL, asUser, ompApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const {manager, ada, mary} = await seedPress(ompApi, tag, {doiPrefix: PREFIX, doiCreationTime: 'never'});
        const axolotl = await seedBook(ompApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedBook(ompApi, tag, 'ta', mary, TARDIGRADE, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);
        const reader = await readerPage(browser, baseURL);
        const logBefore = (await activityLines(page, tag, axolotl.submissionId)).length;

        // Published without a DOI: both "Needs DOI"; the reader's page has no
        // "DOI:" line (Rules 5, 43).
        await dois.goto();
        const axRow = dois.row(axolotl.submissionId);
        const taRow = dois.row(tardigrade.submissionId);
        await expect(dois.rowBadge(axRow)).toHaveText('Needs DOI');
        await expect(dois.rowBadge(taRow)).toHaveText('Needs DOI');
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, null);

        // Control: "DOIs" in the side menu and the page open (Rule 1).
        await expect(sideMenuEntry(page, 'DOIs')).toHaveCount(1);

        // "Assign DOIs" on one work (Rules 6a, 24, 25).
        await dois.tick([axolotl.submissionId]);
        await dois.openBulkActions();
        await expect(dois.bulkDescription()).toHaveText(TEXT.takeAction(1));
        const assign = await dois.chooseBulkAction('Assign DOIs');
        await expect(assign).toContainText('1 item(s)');
        await expect(assign.getByRole('button', {name: 'Assign DOIs', exact: true})).toBeVisible();
        await expect(assign.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        const assigned = await dois.confirmAction(assign, 'Assign DOIs');
        expect(assigned.status()).toBe(200);
        await dois.expectNotice(TEXT.assigned);
        await expect(dois.rowCheckbox(axRow)).not.toBeChecked();
        await expect(dois.rowCheckbox(taRow)).not.toBeChecked();
        await dois.expand(axRow, axolotl.submissionId);
        const axDoi = await doiValue(dois.doiBox(axRow, MONOGRAPH));
        await expect(dois.doiBadge(axRow, MONOGRAPH)).toHaveText('Unregistered');

        // One already carrying a DOI keeps it; the other gets its own
        // (Rule 25).
        await dois.runBulk('Assign DOIs', [axolotl.submissionId, tardigrade.submissionId]);
        await dois.expand(axRow, axolotl.submissionId);
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.doiBox(axRow, MONOGRAPH)).toHaveValue(axDoi);
        const taDoi = await doiValue(dois.doiBox(taRow, MONOGRAPH));
        expect(taDoi).not.toBe(axDoi);

        // The Activity Log: one more "Submission metadata updated" under the
        // Press Manager's name (Side effects).
        const logAfter = await activityLines(page, tag, axolotl.submissionId);
        expect(logAfter.length).toBe(logBefore + 1);
        expect(logAfter.map((l) => l.user)).toContain('Mona Manager');

        // The reader's page shows the DOI (Rules 10, 43).
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, axDoi);

        // DOIs switched off: no "DOIs" in the side menu, the address refused;
        // the reader's line stays (Rules 1, 43; Actors row 2).
        await settings.goto('Setup');
        await settings.enableBox().uncheck();
        await settings.save(settings.setup);
        await page.goto(`/index.php/${tag}/user/profile`);
        await expectSideMenu(page);
        await expect(sideMenuEntry(page, 'Settings')).toHaveCount(1);
        await expect(sideMenuEntry(page, 'DOIs')).toHaveCount(0);
        await dois.gotoExpectingDenied(TEXT.doisOff);
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, axDoi);

        // Every kind unticked: the same (Rule 1; Settings bullet 2).
        await settings.goto('Setup');
        await settings.enableBox().check();
        await settings.kindBox('Monographs').uncheck();
        await settings.save(settings.setup);
        await settings.goto('Setup');
        await expect(settings.enableBox()).toBeChecked();
        expect(await settings.kinds()).toEqual(KINDS.map((label) => ({label, checked: false})));
        await page.goto(`/index.php/${tag}/user/profile`);
        await expectSideMenu(page);
        await expect(sideMenuEntry(page, 'Settings')).toHaveCount(1);
        await expect(sideMenuEntry(page, 'DOIs')).toHaveCount(0);
        await dois.gotoExpectingDenied(TEXT.doisOff);

        // No email about the DOIs (Side effects), bounded by the control.
        await expectNoMailBesidesControl(browser, baseURL, pkpMail, tag, manager, [`${tag}al`, `${tag}ma`]);
        await reader.context().close();
    });

    test('S7: type, change and clear a DOI by hand', async ({browser, baseURL, asUser, ompApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const {manager, ada, mary} = await seedPress(ompApi, tag, {
            doiPrefix: PREFIX,
            doiCreationTime: 'never',
            doiSuffixType: 'none',
            enabledDoiTypes: BOOK_KINDS,
        });
        const axolotl = await seedBook(ompApi, tag, 'ax', ada, AXOLOTL, {
            published: true,
            chapters: [TIDES_SEED],
            publicationFormats: [{name: 'PDF', file: 'article.pdf'}],
        });
        const tardigrade = await seedBook(ompApi, tag, 'ta', mary, TARDIGRADE, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);
        const reader = await readerPage(browser, baseURL);
        const first = `${PREFIX}/e2e-a1-${tag}`;
        const second = `${PREFIX}/e2e-a2-${tag}`;
        const chapter1 = `${PREFIX}/e2e-c1-${tag}`;
        const chapter2 = `${PREFIX}/e2e-c2-${tag}`;
        const format1 = `${PREFIX}/e2e-f1-${tag}`;
        const logBefore = (await activityLines(page, tag, axolotl.submissionId)).length;

        // The "None" format and its "DOI management page" link (Fields; Rule 6b).
        await settings.goto('Setup');
        await expect(settings.formatRadio('None - Suffixes must be entered manually on the DOI management page and will not be generated automatically')).toBeChecked();
        await expect(settings.formatRadio('Default')).not.toBeChecked();
        const fetched = page.waitForResponse((r) => isListFetch(r), {timeout: 30_000});
        await settings.managementPageLink().click();
        await fetched;
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tag}/dois`));
        await expect(dois.heading()).toBeVisible();
        await dois.expectListSettled();

        // A typed DOI (Fields, a DOI box; Rules 18, 32).
        const axRow = dois.row(axolotl.submissionId);
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, MONOGRAPH)).toHaveJSProperty('readOnly', true);
        await dois.startEditing(axRow);
        await expect(dois.doiBox(axRow, MONOGRAPH)).toHaveJSProperty('readOnly', false);
        await dois.doiBox(axRow, MONOGRAPH).fill(first);
        await dois.saveEditing(axRow);
        await dois.expectNotice(TEXT.updated);
        await expect(dois.doiBox(axRow, MONOGRAPH)).toHaveValue(first);
        await expect(dois.doiBadge(axRow, MONOGRAPH)).toHaveText('Unregistered');

        // The other side: the reader's line; one more Activity Log line
        // (Rules 10, 43; Side effects).
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, first);
        const logTyped = (await activityLines(page, tag, axolotl.submissionId)).length;
        expect(logTyped).toBe(logBefore + 1);

        // Refused values: each leaves the box empty again and the row "Needs
        // DOI" (Fields, a DOI box; Rules 9, 18).
        await dois.goto();
        const taRow = dois.row(tardigrade.submissionId);
        await dois.expand(taRow, tardigrade.submissionId);
        for (const value of ['abc', `${PREFIX}/a b`, first]) {
            await dois.startEditing(taRow);
            await dois.doiBox(taRow, MONOGRAPH).fill(value);
            const statuses = await dois.saveEditing(taRow);
            expect(statuses.every((s) => s >= 400), `${value} refused (${statuses})`).toBe(true);
            await dois.expectNotice(TEXT.partialFailure);
            await expect(dois.doiBox(taRow, MONOGRAPH)).toHaveValue('');
            await expect(dois.doiBadge(taRow, MONOGRAPH)).toHaveText('Needs DOI');
        }

        // Changed: the reader's line follows; a press's Activity Log gains
        // no line (Rules 10, 18; Side effects).
        await dois.expand(axRow, axolotl.submissionId);
        await dois.startEditing(axRow);
        await dois.doiBox(axRow, MONOGRAPH).fill(second);
        await dois.saveEditing(axRow);
        await dois.expectNotice(TEXT.updated);
        await expect(dois.doiBox(axRow, MONOGRAPH)).toHaveValue(second);
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, second);
        expect((await activityLines(page, tag, axolotl.submissionId)).length).toBe(logTyped);

        // A chapter's and a format's DOI typed, then changed and emptied;
        // "Needs DOI" keeps the book while its format lacks one; the book's
        // Activity Log gains no line (Rules 18, 32, 45, 51; Side effects).
        const logAll = (await activityLines(page, tag, axolotl.submissionId, null)).length;
        await dois.goto();
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, TIDES)).toHaveValue('');
        await expect(dois.doiBox(axRow, FORMAT_PDF)).toHaveValue('');
        await dois.startEditing(axRow);
        await dois.doiBox(axRow, TIDES).fill(chapter1);
        await dois.doiBox(axRow, FORMAT_PDF).fill(format1);
        const typed = await dois.saveEditing(axRow);
        expect(typed.every((st) => st < 400), `the saves answered (${typed})`).toBe(true);
        await dois.expectNotice(TEXT.updated);
        await expect(dois.doiBox(axRow, TIDES)).toHaveValue(chapter1);
        await expect(dois.doiBox(axRow, FORMAT_PDF)).toHaveValue(format1);
        await expect(dois.doiBadge(axRow, TIDES)).toHaveText('Unregistered');
        await expect(dois.doiBadge(axRow, FORMAT_PDF)).toHaveText('Unregistered');
        await dois.startEditing(axRow);
        await dois.doiBox(axRow, TIDES).fill(chapter2);
        await dois.doiBox(axRow, FORMAT_PDF).fill('');
        await dois.saveEditing(axRow);
        await expect(dois.doiBox(axRow, TIDES)).toHaveValue(chapter2);
        await expect(dois.doiBox(axRow, FORMAT_PDF)).toHaveValue('');
        await expect(dois.doiBadge(axRow, FORMAT_PDF)).toHaveText('Needs DOI');
        await expect(dois.doiBox(axRow, MONOGRAPH)).toHaveValue(second);
        await dois.pressFilter('Needs DOI');
        await expect(dois.clearFilterButton('Needs DOI')).toBeVisible();
        await expect(dois.row(axolotl.submissionId)).toHaveCount(1);
        await dois.pressFilter('Needs DOI');
        await expect(dois.clearFilterButton('Needs DOI')).toHaveCount(0);
        expect((await activityLines(page, tag, axolotl.submissionId, null)).length, 'no line from the chapter and format saves').toBe(logAll);

        // Cleared: "Needs DOI" again; the book's own reader line goes, the
        // chapter's in the table of contents stays (Rules 10, 18, 43, 54).
        await dois.goto();
        await dois.expand(axRow, axolotl.submissionId);
        await dois.startEditing(axRow);
        await dois.doiBox(axRow, MONOGRAPH).fill('');
        await dois.saveEditing(axRow);
        await expect(dois.doiBox(axRow, MONOGRAPH)).toHaveValue('');
        await expect(dois.doiBadge(axRow, MONOGRAPH)).toHaveText('Needs DOI');
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, null);
        await expectTocDoi(reader, tag, axolotl.submissionId, TIDES, chapter2);

        // Control: "Edit", then "Save" with nothing changed closes the
        // editing and sends nothing (Rule 18).
        await dois.expand(taRow, tardigrade.submissionId);
        await dois.startEditing(taRow);
        const statuses = await dois.saveEditing(taRow, {expectRequests: false});
        expect(statuses).toEqual([]);
        await expect(dois.doiBox(taRow, MONOGRAPH)).toHaveJSProperty('readOnly', true);
        await reader.context().close();
    });

    test('S8: a custom suffix pattern', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s8', testInfo);
        const {manager, ada} = await seedPress(ompApi, tag, {context: {acronym: 'JPK'}, doiPrefix: PREFIX, doiCreationTime: 'never'});
        const axolotl = await seedBook(ompApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);

        // Control: before "Custom pattern", no pattern group (Fields).
        await settings.goto('Setup');
        await expect(settings.formatRadio('Default')).toBeChecked();
        await expect(settings.patternGroup()).toHaveCount(0);

        // The pattern group: its help and the press's four boxes (Fields).
        await settings.formatRadio('Custom pattern - (not recommended)').check();
        await expect(settings.patternGroup()).toBeVisible();
        await expect(settings.patternGroup()).toContainText(TEXT.patternHelpOpening);
        await expect(settings.patternGroup().getByRole('textbox')).toHaveCount(PATTERN_BOXES.length);
        for (const label of PATTERN_BOXES) {
            await expect(settings.patternBox(label)).toBeVisible();
        }

        // An empty box refused under "Submissions" (Fields).
        await settings.saveRefused(settings.setup, settings.patternBox('Submissions'), TEXT.patternRequired);

        // Saved (Fields).
        await settings.patternBox('Submissions').fill('%p.%m');
        await settings.save(settings.setup);

        // The made DOI: "10.1234/jpk.{its number}" (Rules 6c, 16, 25).
        await dois.goto();
        await dois.runBulk('Assign DOIs', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.assigned);
        const axRow = dois.row(axolotl.submissionId);
        await expect(dois.rowActions(axRow)).toContainText(String(axolotl.submissionId));
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, MONOGRAPH)).toHaveValue(`${PREFIX}/jpk.${axolotl.submissionId}`);
    });

    test('S9: mark statuses by hand; "Needs Sync" after unpublishing', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s9', testInfo);
        const {manager, ada, mary} = await seedPress(ompApi, tag, {doiPrefix: PREFIX, enabledDoiTypes: BOOK_KINDS});
        const axolotl = await seedBook(ompApi, tag, 'ax', ada, AXOLOTL, {
            published: true,
            chapters: [TIDES_SEED],
            publicationFormats: [{name: 'PDF', file: 'article.pdf'}],
        });
        const tardigrade = await seedBook(ompApi, tag, 'ta', mary, TARDIGRADE, {decisions: TO_PRODUCTION});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const axRow = dois.row(axolotl.submissionId);
        const taRow = dois.row(tardigrade.submissionId);
        // The book's badge, then its "Monograph" row, with "Tides" and
        // "Format / PDF" reading what that row reads after every step (Rule 52).
        const expectAxolotl = async (badge, row) => {
            if (badge !== null) await expect(dois.rowBadge(axRow)).toHaveText(badge);
            await dois.expand(axRow, axolotl.submissionId);
            for (const type of [MONOGRAPH, TIDES, FORMAT_PDF]) {
                await expect(dois.doiBadge(axRow, type), type).toHaveText(row);
            }
        };

        await dois.goto();
        await dois.expand(axRow, axolotl.submissionId);
        await doiValue(dois.doiBox(axRow, TIDES));
        await doiValue(dois.doiBox(axRow, FORMAT_PDF));
        await expectAxolotl('Unregistered', 'Unregistered');
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');

        // "Mark DOIs Registered" refused by the unpublished work (Rule 26).
        const refused = await dois.runBulk('Mark DOIs Registered', [axolotl.submissionId, tardigrade.submissionId]);
        expect(refused.status()).toBe(400);
        await expect(dois.failedDialog()).toContainText(
            `Failed to mark the DOI registered for ${TARDIGRADE}. The submission must be published before the status can be updated.`
        );
        await expect(dois.failedDialog()).not.toContainText(AXOLOTL);
        await dois.closeFailedDialog();
        await expectAxolotl('Unregistered', 'Unregistered');

        // Marked registered: "Edit" greyed out (Rules 19, 26).
        await dois.runBulk('Mark DOIs Registered', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.markedRegistered);
        await expectAxolotl('Registered', 'Registered');
        await expect(dois.editButton(axRow)).toBeDisabled();

        // Unpublished: "Unpublished", its row "Needs Sync", "Edit" pressable
        // (Rules 16, 19, 32).
        await openVersion(page, tag, axolotl.submissionId, axolotl.publicationId);
        await unpublishOpenVersion(page);
        await dois.goto();
        await expectAxolotl('Unpublished', 'Needs Sync');
        await expect(dois.editButton(axRow)).toBeEnabled();

        // Published again: still "Needs Sync" (Rule 32).
        await openVersion(page, tag, axolotl.submissionId, axolotl.publicationId);
        await publishOpenVersion(page);
        await dois.goto();
        await expectAxolotl('Needs Sync', 'Needs Sync');

        // "Mark DOIs Unregistered" (Rule 27).
        await dois.runBulk('Mark DOIs Unregistered', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.markedUnregistered);
        await expectAxolotl('Unregistered', 'Unregistered');

        // "Mark DOIs Needs Sync" refused (Rule 28; A14 not asserted).
        await dois.tick([axolotl.submissionId]);
        const stale = await dois.chooseBulkAction('Mark DOIs Needs Sync');
        await expect(stale).toContainText(TEXT.markStaleQuestion(1));
        const staleRefused = await dois.confirmAction(stale, 'Mark DOIs Needs Sync');
        expect(staleRefused.status()).toBe(400);
        await expect(dois.failedDialog()).toContainText(
            `Failed to mark the DOI needs sync for ${AXOLOTL}. The DOI cannot be marked needs sync because they have not yet been registered or submitted.`
        );
        await dois.closeFailedDialog();
        await expectAxolotl('Unregistered', 'Unregistered');

        // Marked "Needs Sync" after "Mark DOIs Registered" (Rule 28).
        await dois.runBulk('Mark DOIs Registered', [axolotl.submissionId]);
        await expectAxolotl('Registered', 'Registered');
        await dois.runBulk('Mark DOIs Needs Sync', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.markedStale);
        await expectAxolotl('Needs Sync', 'Needs Sync');

        // A newer version ("DOI Versioning" "No"): "Registered" kept while it
        // is unpublished, "Needs Sync" once it is published (Rules 32, 52).
        await dois.runBulk('Mark DOIs Registered', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.markedRegistered);
        await expectAxolotl('Registered', 'Registered');
        const frame = await openVersion(page, tag, axolotl.submissionId, axolotl.publicationId);
        const newPublicationId = await createVersion(page, frame);
        await dois.goto();
        await expectAxolotl(null, 'Registered');
        await openVersion(page, tag, axolotl.submissionId, newPublicationId);
        await publishOpenVersion(page);
        await dois.goto();
        await expectAxolotl(null, 'Needs Sync');

        // Control: the unpublished work read "Unpublished" throughout (Rule 16).
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');
    });

    test('S10: one DOI for every version ("DOI Versioning" "No")', async ({browser, baseURL, asUser, ompApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s10', testInfo);
        const {manager, ada} = await seedPress(ompApi, tag, {doiPrefix: PREFIX, doiVersioning: false, enabledDoiTypes: BOOK_KINDS});
        const axolotl = await seedBook(ompApi, tag, 'ax', ada, AXOLOTL, {
            published: true,
            chapters: [TIDES_SEED],
            publicationFormats: [{name: 'PDF', file: 'article.pdf'}],
        });
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const reader = await readerPage(browser, baseURL);
        const changed = `${PREFIX}/e2e-v1-${tag}`;
        const chapterChanged = `${PREFIX}/e2e-c3-${tag}`;
        const row = dois.row(axolotl.submissionId);

        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        const firstDoi = await doiValue(dois.doiBox(row, MONOGRAPH));
        const tidesDoi = await doiValue(dois.doiBox(row, TIDES));
        const formatDoi = await doiValue(dois.doiBox(row, FORMAT_PDF));

        // A new version: the expanded view still shows the published
        // version and its DOI (Rule 17).
        const frame = await openVersion(page, tag, axolotl.submissionId, axolotl.publicationId);
        const newPublicationId = await createVersion(page, frame);
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.versionName(row)).toHaveText(/^\s*Version of Record 1\.0\s*$/);
        await expect(dois.doiBox(row, MONOGRAPH)).toHaveValue(firstDoi);
        await expect(dois.versionsBar(row)).toHaveCount(0);

        // The new version published: the same "DOI:" line (Rules 11, 43).
        await openVersion(page, tag, axolotl.submissionId, newPublicationId);
        await publishOpenVersion(page);
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, firstDoi);

        // Control: before the change, the older version's page shows the
        // first DOI (Rules 11, 43).
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, firstDoi, {version: axolotl.publicationId});

        // Changed for every version (Rules 11, 43).
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await dois.startEditing(row);
        await dois.doiBox(row, MONOGRAPH).fill(changed);
        await dois.saveEditing(row);
        await dois.expectNotice(TEXT.updated);
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, changed);
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, changed, {version: axolotl.publicationId});

        // A press's chapter and format: the view, now on the new version,
        // holds their DOIs from before it; "Tides"' DOI changed shows in both
        // versions' tables of contents (Rules 50, 54).
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.versionName(row)).not.toHaveText(/^\s*Version of Record 1\.0\s*$/);
        await expect(dois.doiBox(row, MONOGRAPH)).toHaveValue(changed);
        await expect(dois.doiBox(row, TIDES)).toHaveValue(tidesDoi);
        await expect(dois.doiBox(row, FORMAT_PDF)).toHaveValue(formatDoi);
        await dois.startEditing(row);
        await dois.doiBox(row, TIDES).fill(chapterChanged);
        await dois.saveEditing(row);
        await dois.expectNotice(TEXT.updated);
        await expect(dois.doiBox(row, TIDES)).toHaveValue(chapterChanged);
        await expectTocDoi(reader, tag, axolotl.submissionId, TIDES, chapterChanged);
        await expectTocDoi(reader, tag, axolotl.submissionId, TIDES, chapterChanged, {version: axolotl.publicationId});
        await reader.context().close();
    });

    test('S11: a DOI per major version ("DOI Versioning" "Yes")', async ({browser, baseURL, asUser, ompApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s11', testInfo);
        const {manager, ada} = await seedPress(ompApi, tag, {doiPrefix: PREFIX, doiVersioning: true, enabledDoiTypes: BOOK_KINDS});
        const axolotl = await seedBook(ompApi, tag, 'ax', ada, AXOLOTL, {
            published: true,
            chapters: [TIDES_SEED],
            publicationFormats: [{name: 'PDF', file: 'article.pdf'}],
        });
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const reader = await readerPage(browser, baseURL);
        const changed = `${PREFIX}/e2e-v2-${tag}`;
        const chapterChanged = `${PREFIX}/e2e-c4-${tag}`;
        const row = dois.row(axolotl.submissionId);

        // Control: before the major version, no "There are … versions." and
        // no "View all" (Rule 20).
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        const doi1 = await doiValue(dois.doiBox(row, MONOGRAPH));
        const tides1 = await doiValue(dois.doiBox(row, TIDES));
        const format1 = await doiValue(dois.doiBox(row, FORMAT_PDF));
        await expect(dois.editButton(row)).toBeVisible();
        await expect(dois.versionsBar(row)).toHaveCount(0);

        // A major version: "There are 2 versions." with "View all"; the
        // window's blocks, the new one "Unpublished" without a DOI
        // (Rules 12, 20).
        let frame = await openVersion(page, tag, axolotl.submissionId, axolotl.publicationId);
        const majorId = await createVersion(page, frame, 'Major Revision');
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.versionsBar(row)).toContainText(TEXT.versionsLine(2));
        await expect(dois.viewAllButton(row)).toBeVisible();
        await dois.openVersionsWindow(row);
        await expect(dois.versionHeadings()).toHaveText([
            /^\s*Version of Record 1\.0 \(.+\)\s*$/,
            /^\s*Version of Record 2\.0 Unpublished\s*$/,
        ]);
        await expect(dois.versionDoiBox(dois.versionBlock('Version of Record 1.0'), MONOGRAPH)).toHaveValue(doi1);
        await expect(dois.versionDoiBox(dois.versionBlock('Version of Record 2.0'), MONOGRAPH)).toHaveValue('');
        // A press's chapter and format: 2.0's rows without a DOI before its
        // publish, while 1.0's keep theirs (Rule 50).
        await expect(dois.versionDoiBox(dois.versionBlock('Version of Record 2.0'), TIDES)).toHaveValue('');
        await expect(dois.versionDoiBox(dois.versionBlock('Version of Record 2.0'), FORMAT_PDF)).toHaveValue('');
        await expect(dois.versionDoiBox(dois.versionBlock('Version of Record 1.0'), TIDES)).toHaveValue(tides1);
        await expect(dois.versionDoiBox(dois.versionBlock('Version of Record 1.0'), FORMAT_PDF)).toHaveValue(format1);
        await dois.closeVersionsWindow();

        // The major version published: a DOI of its own; its page shows it,
        // 1.0's page keeps 1.0's (Rules 12, 43).
        await openVersion(page, tag, axolotl.submissionId, majorId);
        await publishOpenVersion(page);
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await dois.openVersionsWindow(row);
        const block2 = dois.versionBlock('Version of Record 2.0');
        const doi2 = await doiValue(dois.versionDoiBox(block2, MONOGRAPH));
        expect(doi2).not.toBe(doi1);
        // After 2.0's publish its chapter and format carry DOIs of their own,
        // different from 1.0's (Rule 50).
        const tides2 = await doiValue(dois.versionDoiBox(block2, TIDES));
        const format2 = await doiValue(dois.versionDoiBox(block2, FORMAT_PDF));
        expect(tides2).not.toBe(tides1);
        expect(format2).not.toBe(format1);
        await dois.closeVersionsWindow();
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, doi2);
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, doi1, {version: axolotl.publicationId});

        // A minor version: still "There are 2 versions."; the window holds
        // 1.0's block and 2.1's, "Unpublished", with 2.0's DOI (Rules 12, 20).
        frame = await openVersion(page, tag, axolotl.submissionId, majorId);
        await createVersion(page, frame, 'Minor Revision');
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.versionsBar(row)).toContainText(TEXT.versionsLine(2));
        await dois.openVersionsWindow(row);
        await expect(dois.versionHeadings()).toHaveText([
            /^\s*Version of Record 1\.0 \(.+\)\s*$/,
            /^\s*Version of Record 2\.1 Unpublished\s*$/,
        ]);
        const block21 = dois.versionBlock('Version of Record 2.1');
        await expect(dois.versionDoiBox(block21, MONOGRAPH)).toHaveValue(doi2);
        await expect(dois.versionDoiBox(block21, TIDES)).toHaveValue(tides2);
        await expect(dois.versionDoiBox(block21, FORMAT_PDF)).toHaveValue(format2);

        // One "Edit" for the window: 2.1's DOI changed; 2.0's page shows it,
        // 1.0's keeps its own (Rules 12, 20, 43).
        await expect(dois.versionsEditButton()).toHaveText(/^\s*Edit\s*$/);
        await dois.versionsEditButton().click();
        await expect(dois.versionsEditButton()).toHaveText(/^\s*Save\s*$/);
        await dois.versionDoiBox(block21, MONOGRAPH).fill(changed);
        const saved = page.waitForResponse((r) => /\/api\/v1\/dois\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 30_000});
        await dois.versionsEditButton().click();
        expect((await saved).status()).toBe(200);
        await dois.expectNotice(TEXT.updated);
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, changed, {version: majorId});
        await expectBookDoi(reader, tag, axolotl.submissionId, AXOLOTL, doi1, {version: axolotl.publicationId});

        // A press's chapter: "Tides"' DOI changed in 2.1's block through the
        // window's "Edit"; 2.0's table of contents shows it, 1.0's keeps 1.0's
        // (Rules 50, 54).
        await expect(dois.versionsWindow()).toBeVisible();
        await expect(dois.versionsEditButton()).toHaveText(/^\s*Edit\s*$/);
        await dois.versionsEditButton().click();
        await expect(dois.versionsEditButton()).toHaveText(/^\s*Save\s*$/);
        await dois.versionDoiBox(block21, TIDES).fill(chapterChanged);
        const chapterSaved = page.waitForResponse((r) => /\/api\/v1\/dois\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 30_000});
        await dois.versionsEditButton().click();
        expect((await chapterSaved).status()).toBe(200);
        await dois.expectNotice(TEXT.updated);
        await expectTocDoi(reader, tag, axolotl.submissionId, TIDES, chapterChanged, {version: majorId});
        await expectTocDoi(reader, tag, axolotl.submissionId, TIDES, tides1, {version: axolotl.publicationId});
        await reader.context().close();
    });

    test('S19: a press offers no registration agency', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s19', testInfo);
        const {manager, ada} = await seedPress(ompApi, tag, {doiPrefix: PREFIX});
        const axolotl = await seedBook(ompApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);
        const row = dois.row(axolotl.submissionId);

        // The Plugins list: "Generic Plugins" holds "Static Pages Plugin"
        // and no agency plugin (Purpose; Rule 34).
        await settings.gotoPlugins('staticpagesplugin');
        await expect(settings.pluginRow('staticpagesplugin')).toContainText('Static Pages Plugin');
        await expect(settings.pluginRow('crossrefplugin')).toHaveCount(0);
        await expect(settings.pluginRow('dataciteplugin')).toHaveCount(0);
        await expect(page.locator('tr.gridRow').filter({hasText: /Crossref Manager Plugin|DataCite Manager Plugin/})).toHaveCount(0);

        // The "Registration" tab: the text and "Save" alone; "Saved" (Fields).
        await settings.goto('Registration');
        await expect(settings.registration).toContainText(TEXT.noAgency);
        await expect(settings.registration).toContainText(TEXT.noAgencyHelp);
        await expect(settings.agencySelect()).toHaveCount(0);
        await expect(settings.registration.locator('input:visible, select:visible, textarea:visible')).toHaveCount(0);
        await expect(settings.registration.getByRole('button')).toHaveText(['Save']);
        await settings.save(settings.registration);

        // The DOIs page: no "Deposit All"; "Bulk Actions" without "Export
        // DOIs" and "Deposit DOIs"; no agency box (Purpose; Rules 24, 36).
        await dois.goto();
        await expect(dois.bulkActionsButton()).toBeVisible();
        await expect(dois.depositAllButton()).toHaveCount(0);
        expect(await dois.bulkLabels()).toEqual(['Select All', 'Expand all', ...MARK_ACTIONS]);
        await expect(dois.bulkItem('Export DOIs')).toHaveCount(0);
        await expect(dois.bulkItem('Deposit DOIs')).toHaveCount(0);
        await dois.closeBulkActions();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.editButton(row)).toBeVisible();
        await expect(dois.doiBox(row, MONOGRAPH)).toHaveValue(MADE);
        await expect(dois.agencyPanel(row)).toHaveCount(0);

        // Control: "Mark DOIs Registered" works on the book (Rule 26).
        await dois.runBulk('Mark DOIs Registered', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.markedRegistered);
        await expect(dois.rowBadge(row)).toHaveText('Registered');
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.doiBadge(row, MONOGRAPH)).toHaveText('Registered');
    });
});
