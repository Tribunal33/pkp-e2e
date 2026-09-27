// @ts-check
/**
 * @file playwright/tests/U70-catalog-management.spec.js
 *
 * Catalog management — OMP suite: one test per canonical scenario a press
 * runs, S1–S6 ({OMP}), plus S7's press side: the control of the {OJS OPS}
 * absence (the journal's and the preprint server's side run in their own
 * suites; CI installs one app per job, so the seeded press's control rides
 * here). In the press's own words: the Press manager, the Series editor,
 * the Marketing and sales coordinator, books, the Catalog page, "Catalog
 * Entry", the "Catalog Management" notice.
 * Spec: docs/specs/U70-catalog-management.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A2 🐞: S1 reads the "Catalog Management" notice's heading and sentence,
 *   never whether links stand above it.
 * - A11 🐞: S3 reads the ordering notice's "…to change the order of features
 *   on the homepage.", never its "Drag-and-drop" opening, and drags nothing.
 * - A13 🐞: S3 never presses the last featured book's down arrow.
 * - A14 🐞: the arrows are located by their place, never by their
 *   screen-reader names.
 * - A3 🐞: S4 reads the whole catalog after a filter as a set of rows, never
 *   its order.
 * - A8, A9 🐞: every "Add Entry" › "Save" follows a clicked suggestion and
 *   its tag; no book is chosen twice.
 * - A4, A5, A6, A7, A10, A12 🐞 and A1 ❓: no test reaches those states.
 *
 * Seeding: scenario endpoints only. S1–S6 each build a scratch press with
 * throwaway accounts (the username twice as password) as footnote s says;
 * S7 adds one published book of `author.alex` to publicknowledge, whose
 * settings and roster stay untouched and whose list is never read. Every
 * actor gets its own `asUser` context (no default user, patterns.md
 * "Fixture selection"); the visitor is a browser context with an empty
 * storage state (parallel lesson 8). Mail reads are scoped by the scratch
 * accounts' own addresses (A8). Every absence is a settled read paired with
 * a positive control taken the same way (M4, M6): a list read after its own
 * fetch, a box read after its own save, a mailbox read after the message the
 * scenario does send.
 *
 * Why no serial half: the public catalog, "New Releases" and a series' page
 * read the database directly (CatalogHandler's `page`, `newReleases`,
 * `series`); only a category's page waits on the search index's queued job
 * (U16 Rule 8a), and no scenario here reads one.
 */
const path = require('path');
const {test: base, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {EditorialSideMenu} = require('../pages/ReaderCommentsPages.js');
const {unpublishFromWorkflow} = require('../pages/PublicationPages.js');
const {openProduction, pressNoticeHeading, expectPressNotice, PRESS_NOTICES} = require('../pages/ProductionStagePages.js');
const {
    CatalogPage,
    CatalogEntryPage,
    PublicCatalog,
    publishFromWorkflow,
} = require('../pages/CatalogPages.js');

const T = 30_000;
const FILES = path.join(__dirname, '..', 'fixtures', 'files');
const PRODUCTION = ['skipExternalReview', 'sendToProduction'];
const PUBLISHED_LOG = 'The submission was published.';
const METADATA_UPDATED = 'Submission metadata updated';
const ACCESS_DENIED = 'The current role does not have access to this operation.';
const FORM_REFUSED = 'The form was not saved because 1 error(s) were encountered. Please correct these errors and try again.';

/** The Author's task notice for a published book (Side effects bullet 2). */
const publishedTask = (title) => `A new version of your submission, "${title}", was published.`;

/** A visitor's page: a second browser context with no session at all (parallel lesson 8). */
const test = base.extend({
    visitor: async ({browser, baseURL}, use) => {
        const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'});
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
});

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u70${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/** A page of an actor's own signed-in browser context. */
async function actorPage(asUser, username) {
    return (await asUser(username)).newPage();
}

/**
 * A scratch press with a throwaway Press manager (`${tag}mg`) and Author
 * (`${tag}au`, "Ada Author"), plus `extra` accounts and context keys.
 */
async function seedPress(ompApi, tag, {extra = [], ...keys} = {}) {
    await ompApi.createContext({
        tag,
        users: [user(`${tag}mg`, 'Mona', 'Manager', ['manager']), user(`${tag}au`, 'Ada', 'Author', ['author']), ...extra],
        ...keys,
    });
    return {manager: `${tag}mg`, author: `${tag}au`};
}

/** A book of the press, by `submitter` (the press's Author by default). */
async function seedBook(ompApi, tag, n, title, keys = {}) {
    return ompApi.createSubmission({tag: `${tag}b${n}`, context: tag, submitter: `${tag}au`, title, ...keys});
}

/**
 * A window that opens from the right: its right edge on the viewport's, its
 * left edge in from the left, read once its slide-in has settled.
 */
async function expectFromRight(page, locator) {
    const viewport = page.viewportSize();
    await expect(async () => {
        const box = await locator.boundingBox();
        expect(box, 'the window has a box').not.toBeNull();
        expect(Math.abs(box.x + box.width - viewport.width)).toBeLessThanOrEqual(2);
        expect(box.x).toBeGreaterThan(0);
    }).toPass({timeout: 5_000});
}

/** The rows of a book's Activity Log, read once the table has drawn more than its heading; the window is closed again. */
async function activityLogLines(workflow) {
    const dialog = await workflow.openActivityLog();
    const rows = dialog.getByRole('row');
    await expect.poll(() => rows.count(), {timeout: T}).toBeGreaterThan(1);
    const lines = (await rows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    await workflow.closeActivityLog();
    return lines;
}

/** The Author's task rows, as "{sentence} | {title}", read from the Tasks window of My Submissions. */
async function authorTasks(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/dashboard/mySubmissions`);
    const tasks = new TasksPanel(page);
    await tasks.open();
    const rows = await tasks.rowTexts();
    await tasks.close();
    return rows;
}

/** A picture's address is a cover's small copy, no wider than 106 and no taller than 100 pixels. */
function expectSmallCopy(info) {
    expect(info.src, 'the small copy of the cover').toMatch(/_coverImage_en_t\.png$/);
    expect(info.width).toBeLessThanOrEqual(106);
    expect(info.height).toBeLessThanOrEqual(100);
}

test.describe('Catalog management', () => {
    test('S1: Books added to the catalog with "Add Entry"', async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const {manager, author} = await seedPress(ompApi, tag);
        const harbour = await seedBook(ompApi, tag, 1, 'Lantern Harbour', {decisions: PRODUCTION});
        const tides = await seedBook(ompApi, tag, 2, 'Lantern Tides', {decisions: PRODUCTION, datePublished: '2020-05-05'});
        await seedBook(ompApi, tag, 3, 'Lantern Draft');

        const page = await actorPage(asUser, manager);
        const catalog = new CatalogPage(page, tag);
        const workflow = new WorkflowPage(page, tag);

        // Nothing published yet: the page, its tab, the list and its empty
        // line, no column headings (Rule 1; Fields).
        await catalog.openFromSideMenu();
        await expect(catalog.heading()).toHaveText('Catalog');
        await expect(catalog.tab('All Monographs')).toBeVisible();
        await expect(catalog.listHeading()).toHaveText('Monographs');
        await expect(catalog.emptyLine()).toHaveText('No items found.');
        await expect(catalog.columnHeadings()).toHaveCount(0);
        await expect(catalog.rows()).toHaveCount(0);

        // "Awaiting approval." with a saved date (Rule 14).
        await workflow.gotoEditorial(tides.submissionId);
        await workflow.selectStage('Production');
        const modal = workflow.dialog();
        await expectPressNotice(modal, PRESS_NOTICES.awaiting);
        await expect(pressNoticeHeading(modal, PRESS_NOTICES.catalog)).toHaveCount(0);

        // The "Add Entry" panel: from the right, "Close" at its top left;
        // "Lantern" suggests the two Production books, not the draft.
        await catalog.goto();
        let panel = await catalog.openAddEntry();
        await expect(panel.heading()).toBeVisible();
        await expectFromRight(page, panel.root());
        const panelBox = await panel.root().boundingBox();
        const closeBox = await panel.closeButton().boundingBox();
        expect(closeBox.x - panelBox.x, '"Close" sits at the panel\'s left').toBeLessThan(panelBox.width / 2);
        await panel.type('Lantern');
        await expect(panel.options()).toHaveCount(2);
        await expect(panel.option('Lantern Harbour')).toBeVisible();
        await expect(panel.option('Lantern Tides')).toBeVisible();
        await expect(panel.option('Lantern Draft')).toHaveCount(0);

        // Two books chosen, each a tag with its cross (Fields).
        await panel.option('Lantern Harbour').click();
        await expect(panel.removeButton('Lantern Harbour')).toBeVisible();
        await panel.choose('Lantern', 'Lantern Tides');
        await expect(panel.removeButton('Lantern Harbour')).toBeVisible();

        // "Save": no confirmation window; the panel closes and the list
        // reloads with both books under "Featured" / "New release" (Rule 12).
        await panel.save();
        await expect(panel.root()).toHaveCount(0);
        await expect(page.getByRole('alertdialog')).toHaveCount(0);
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(catalog.rows()).toHaveCount(2);
        await expect(catalog.rowTitle('Lantern Harbour')).toBeVisible();
        await expect(catalog.rowTitle('Lantern Tides')).toBeVisible();
        await expect(catalog.columnHeadings()).toHaveText(['Featured', 'New release']);

        // The published book's workflow: Done, the log line, and the
        // "Catalog Management" notice in place of "Awaiting approval." (Rule 14).
        await catalog.viewSubmission('Lantern Harbour').click();
        await workflow.expectOpen(harbour.submissionId);
        await workflow.expectStage('Published');
        await workflow.openActivityLog();
        await expect(workflow.activityLogRow(PUBLISHED_LOG)).toHaveCount(1);
        await workflow.closeActivityLog();
        await workflow.selectStage('Production');
        await expectPressNotice(workflow.dialog(), PRESS_NOTICES.catalog);
        await expect(pressNoticeHeading(workflow.dialog(), PRESS_NOTICES.awaiting)).toHaveCount(0);

        // The Author's side: a "Publication Published" email and a task
        // notice for each book (Side effects bullet 2).
        for (const title of ['Lantern Harbour', 'Lantern Tides']) {
            await pkpMail.find({to: mailOf(author), subject: 'Publication Published', contains: title});
        }
        const authorPage = await actorPage(asUser, author);
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasks = new TasksPanel(authorPage);
        await tasks.open();
        await expect(tasks.row(publishedTask('Lantern Harbour'))).toHaveCount(1);
        await expect(tasks.row(publishedTask('Lantern Tides'))).toHaveCount(1);
        await tasks.close();

        // Control: "Add Entry" again: "Lantern" suggests nothing, bounded by
        // the suggestions' own answer, which lists no book; then "Close".
        await catalog.goto();
        panel = await catalog.openAddEntry();
        const answer = await panel.type('Lantern');
        expect(answer.ok()).toBe(true);
        const body = await answer.json();
        expect(body.itemsMax, 'the suggestions\' answer holds no book').toBe(0);
        await expect(panel.options()).toHaveCount(0);
        await panel.close();
    });

    test('S2: Featured books and new releases, and what readers see', async ({asUser, ompApi, pkpMail, visitor}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s2', testInfo);
        const {manager, author} = await seedPress(ompApi, tag);
        const alpha = await seedBook(ompApi, tag, 1, 'Alpha', {published: true, datePublished: '2024-01-10'});
        const beta = await seedBook(ompApi, tag, 2, 'Beta', {published: true, datePublished: '2024-02-10'});
        const gamma = await seedBook(ompApi, tag, 3, 'Gamma', {published: true, datePublished: '2024-03-10'});
        const ids = {Alpha: alpha.submissionId, Beta: beta.submissionId, Gamma: gamma.submissionId};

        const page = await actorPage(asUser, manager);
        const authorPage = await actorPage(asUser, author);
        const catalog = new CatalogPage(page, tag);
        const workflow = new WorkflowPage(page, tag);
        const reader = new PublicCatalog(visitor, tag);

        // Baselines for the control: Alpha's Activity Log and the Author's
        // tasks before any box is pressed.
        await workflow.gotoEditorial(ids.Alpha);
        const alphaLog0 = await activityLogLines(workflow);
        const tasks0 = await authorTasks(authorPage, tag);

        // The Catalog page: the controls, no "Order Features", the headings,
        // newest first, each row's parts (Rule 2; Fields).
        await catalog.openFromSideMenu();
        await expect(catalog.searchBox()).toBeVisible();
        await expect(catalog.filtersButton()).toBeVisible();
        await expect(catalog.addEntryButton()).toBeVisible();
        await expect(catalog.orderFeaturesButton()).toHaveCount(0);
        await expect(catalog.columnHeadings()).toHaveText(['Featured', 'New release']);
        await expect(catalog.shownTitles()).toHaveText(['Gamma', 'Beta', 'Alpha']);
        for (const title of ['Gamma', 'Beta', 'Alpha']) {
            await expect(catalog.rowNumber(title)).toHaveText(String(ids[title]));
            await expect(catalog.rowAuthors(title)).toHaveText('Author');
            await expect(catalog.viewSubmission(title)).toBeVisible();
            await expect(catalog.viewEntry(title)).toBeVisible();
            await catalog.expectFeatured(title, false);
            await catalog.expectNewRelease(title, false);
        }

        // "Featured" ticked: no message, Alpha keeps its place, "Order
        // Features" appears; after a reload Alpha comes first (Rules 2, 6).
        await catalog.pressFeatured('Alpha');
        await catalog.expectFeatured('Alpha', true);
        await expect(catalog.orderFeaturesButton()).toBeVisible();
        await expect(catalog.shownTitles()).toHaveText(['Gamma', 'Beta', 'Alpha']);
        await expect(catalog.noticeTexts()).toHaveCount(0);
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await catalog.reload();
        await expect(catalog.shownTitles()).toHaveText(['Alpha', 'Gamma', 'Beta']);
        await catalog.expectFeatured('Alpha', true);

        // The reader side of "Featured" (Rule 6a).
        await reader.gotoCatalog();
        await expect(reader.titles()).toHaveCount(3);
        await expect(reader.titles().first()).toHaveText('Alpha');

        // "Featured" unticked: back to newest first, no "Order Features";
        // the public catalog no longer puts Alpha first (Rules 2, 6).
        await catalog.pressFeatured('Alpha');
        await catalog.expectFeatured('Alpha', false);
        await catalog.reload();
        await expect(catalog.shownTitles()).toHaveText(['Gamma', 'Beta', 'Alpha']);
        await expect(catalog.orderFeaturesButton()).toHaveCount(0);
        await catalog.expectFeatured('Alpha', false);
        await reader.gotoCatalog();
        await expect(reader.titles()).toHaveCount(3);
        await expect(reader.titles().first()).not.toHaveText('Alpha');

        // "New release" ticked on Beta, then Gamma: "New Releases" lists
        // Gamma, then Beta, and not Alpha (Rule 7).
        await catalog.pressNewRelease('Beta');
        await catalog.expectNewRelease('Beta', true);
        await catalog.pressNewRelease('Gamma');
        await catalog.expectNewRelease('Gamma', true);
        await expect(catalog.noticeTexts()).toHaveCount(0);
        await reader.gotoNewReleases();
        await expect(reader.titles()).toHaveText(['Gamma', 'Beta']);

        // Unpublished, then published again: off the list, then back with
        // its "New release" box ticked (Rules 1, 7, 9).
        await catalog.viewSubmission('Beta').click();
        await workflow.expectOpen(ids.Beta);
        await workflow.selectPage('Title & Abstract');
        await unpublishFromWorkflow(page);
        await catalog.goto();
        await expect(catalog.shownTitles()).toHaveText(['Gamma', 'Alpha']);
        await workflow.gotoEditorial(ids.Beta);
        await workflow.selectPage('Title & Abstract');
        await publishFromWorkflow(page);
        await catalog.goto();
        await expect(catalog.shownTitles()).toHaveText(['Gamma', 'Beta', 'Alpha']);
        await catalog.expectNewRelease('Beta', true);
        await catalog.expectNewRelease('Gamma', true);
        await catalog.expectNewRelease('Alpha', false);
        await reader.gotoNewReleases();
        await expect(reader.titles()).toHaveText(['Gamma', 'Beta']);

        // "New release" unticked on Gamma: "New Releases" lists Beta alone (Rule 7).
        await catalog.pressNewRelease('Gamma');
        await catalog.expectNewRelease('Gamma', false);
        await reader.gotoNewReleases();
        await expect(reader.titles()).toHaveText(['Beta']);

        // Control: no log line for Alpha's presses; the Author's one email is
        // Beta's "Publication Published", and no task notice came but Beta's
        // (Side effects bullets 1, 2).
        await catalog.goto();
        await catalog.viewSubmission('Alpha').click();
        await workflow.expectOpen(ids.Alpha);
        expect(await activityLogLines(workflow)).toEqual(alphaLog0);
        await pkpMail.find({to: mailOf(author), subject: 'Publication Published', contains: 'Beta'});
        expect(await pkpMail.count({to: mailOf(author)}), 'the one email to the Author').toBe(1);
        const notBeta = (rows) => rows.filter((row) => !row.includes('Beta'));
        const tasks1 = await authorTasks(authorPage, tag);
        expect(notBeta(tasks1)).toEqual(notBeta(tasks0));
    });

    test('S3: The featured books put in order', async ({asUser, ompApi, visitor}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const {manager} = await seedPress(ompApi, tag, {catalogSortOption: 'title-ASC'});
        let n = 0;
        for (const [title, position] of [['Oak', 1], ['Elm', 2], ['Ash', 3]]) {
            await seedBook(ompApi, tag, ++n, title, {published: true, featured: [{in: 'catalog', position}]});
        }
        await seedBook(ompApi, tag, ++n, 'Birch', {published: true, datePublished: '2024-01-10', newRelease: [{in: 'catalog'}]});
        await seedBook(ompApi, tag, ++n, 'Maple', {published: true, datePublished: '2025-01-10', newRelease: [{in: 'catalog'}]});

        const page = await actorPage(asUser, manager);
        const catalog = new CatalogPage(page, tag);
        const reader = new PublicCatalog(visitor, tag);

        // The press's order: the featured books in their order, then by
        // title although "Maple" is the newer (Rule 2; Settings bullet 1).
        await catalog.openFromSideMenu();
        await expect(catalog.shownTitles()).toHaveText(['Oak', 'Elm', 'Ash', 'Birch', 'Maple']);

        // "Order Features": the notice, only the featured rows with their
        // arrows, everything else hidden, "Save Order" and "Cancel" (Rule 10a).
        await catalog.startOrdering();
        await expect(catalog.orderingNotice()).toContainText('to change the order of features on the homepage.');
        await expect(catalog.shownTitles()).toHaveText(['Oak', 'Elm', 'Ash']);
        for (const title of ['Oak', 'Elm', 'Ash']) {
            await expect(catalog.upArrow(title)).toBeVisible();
            await expect(catalog.downArrow(title)).toBeVisible();
            await expect(catalog.featuredBox(title)).toBeHidden();
            await expect(catalog.newReleaseBox(title)).toBeHidden();
            await expect(catalog.viewSubmission(title)).toBeHidden();
            await expect(catalog.viewEntry(title)).toBeHidden();
        }
        await expect(catalog.row('Birch')).toBeHidden();
        await expect(catalog.row('Maple')).toBeHidden();
        await expect(catalog.searchBox()).toBeHidden();
        await expect(catalog.filtersButton()).toBeHidden();
        await expect(catalog.addEntryButton()).toBeHidden();
        await expect(catalog.columnHeadings().first()).toBeHidden();
        await expect(catalog.saveOrderButton()).toBeVisible();
        await expect(catalog.cancelOrderButton()).toBeVisible();
        await expect(catalog.orderFeaturesButton()).toHaveCount(0);

        // The arrows: Ash up once, twice; a third time moves nothing (Rule 10b).
        await catalog.upArrow('Ash').click();
        await expect(catalog.shownTitles()).toHaveText(['Oak', 'Ash', 'Elm']);
        await catalog.upArrow('Ash').click();
        await expect(catalog.shownTitles()).toHaveText(['Ash', 'Oak', 'Elm']);
        await catalog.upArrow('Ash').click();
        await expect(catalog.shownTitles()).toHaveText(['Ash', 'Oak', 'Elm']);

        // "Cancel": the saved order is back (Rule 10c).
        await catalog.cancelOrdering();
        await expect(catalog.saveOrderButton()).toHaveCount(0);
        await expect(catalog.shownTitles()).toHaveText(['Oak', 'Elm', 'Ash', 'Birch', 'Maple']);

        // "Save Order": no message, the new order, the same after a reload (Rules 2, 10c).
        await catalog.startOrdering();
        await catalog.upArrow('Ash').click();
        await expect(catalog.shownTitles()).toHaveText(['Oak', 'Ash', 'Elm']);
        await catalog.upArrow('Ash').click();
        await expect(catalog.shownTitles()).toHaveText(['Ash', 'Oak', 'Elm']);
        await catalog.saveOrder();
        await expect(catalog.saveOrderButton()).toHaveCount(0);
        await expect(catalog.noticeTexts()).toHaveCount(0);
        await expect(catalog.shownTitles()).toHaveText(['Ash', 'Oak', 'Elm', 'Birch', 'Maple']);
        await catalog.reload();
        await expect(catalog.shownTitles()).toHaveText(['Ash', 'Oak', 'Elm', 'Birch', 'Maple']);

        // The reader side of the order (Rule 10c).
        await reader.gotoCatalog();
        await expect(reader.titles()).toHaveCount(5);
        await expect(reader.titles().nth(0)).toHaveText('Ash');
        await expect(reader.titles().nth(1)).toHaveText('Oak');
        await expect(reader.titles().nth(2)).toHaveText('Elm');

        // A newly featured book's place: second or third, not last (Rule 11).
        await catalog.pressFeatured('Maple');
        await catalog.expectFeatured('Maple', true);
        await catalog.reload();
        await expect(catalog.shownTitles()).toHaveCount(5);
        const order = await catalog.shownTitles().allInnerTexts();
        const featured = order.slice(0, 4).map((t) => t.trim());
        expect(featured.filter((t) => t !== 'Maple'), 'the other featured books keep their order').toEqual(['Ash', 'Oak', 'Elm']);
        expect([1, 2], `Maple's place among ${featured.join(', ')}`).toContain(featured.indexOf('Maple'));
        await expect(catalog.shownTitles().nth(4)).toHaveText('Birch');
        for (const title of featured) {
            await catalog.expectFeatured(title, true);
        }

        // Leaving while ordering: no question, and the unsaved move is lost (Rule 10c).
        const questions = [];
        page.on('dialog', (dialog) => {
            questions.push(dialog.type());
            dialog.accept().catch(() => {});
        });
        await catalog.startOrdering();
        const second = featured[1];
        await catalog.upArrow(second).click();
        await expect(catalog.shownTitles()).toHaveText([featured[1], featured[0], featured[2], featured[3]]);
        await page.goto(`/index.php/${tag}/dashboard/editorial`);
        await expect(new EditorialSideMenu(page).nav).toBeVisible({timeout: T});
        expect(questions, 'no question on the way out').toEqual([]);
        await catalog.openFromSideMenu();
        await expect(catalog.shownTitles()).toHaveText([...featured, 'Birch']);

        // Control: "New Releases" newest first, whatever the featured order (Rule 7).
        await reader.gotoNewReleases();
        await expect(reader.titles()).toHaveText(['Maple', 'Birch']);
    });

    test('S4: Filters and search', async ({asUser, ompApi, visitor}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const nova = `${tag}nr`;
        const ian = `${tag}il`;
        const {manager} = await seedPress(ompApi, tag, {
            extra: [user(nova, 'Nova', 'Reed', ['author']), user(ian, 'Ian', 'Lowe', ['author'])],
            categories: [
                {path: 'arts', title: 'Arts'},
                {path: 'science', title: 'Science', children: [{path: 'physics', title: 'Physics'}]},
            ],
            series: [{path: 'history', title: 'History'}],
        });
        const abstract = 'A plain abstract.';
        await seedBook(ompApi, tag, 1, 'Harbour Currents', {submitter: nova, abstract, published: true, categories: ['science'], featured: [{in: 'catalog'}]});
        await seedBook(ompApi, tag, 2, 'Tidal Patterns', {submitter: ian, abstract, published: true, categories: ['arts'], featured: [{in: 'category', path: 'arts'}]});
        const wave = await seedBook(ompApi, tag, 3, 'Wave Mechanics', {submitter: ian, abstract, published: true, categories: ['physics']});
        await seedBook(ompApi, tag, 4, 'River Histories', {submitter: ian, abstract, published: true, datePublished: '2024-01-10', series: 'history'});
        await seedBook(ompApi, tag, 5, 'Coastal Towns', {submitter: ian, abstract, published: true, datePublished: '2025-01-10', series: 'history'});
        const all = ['Harbour Currents', 'Tidal Patterns', 'Wave Mechanics', 'River Histories', 'Coastal Towns'];

        const page = await actorPage(asUser, manager);
        const catalog = new CatalogPage(page, tag);
        const reader = new PublicCatalog(visitor, tag);

        // The "Filters" column: its heading, "Categories" and "Series" (Fields).
        await catalog.openFromSideMenu();
        await expect(catalog.rows()).toHaveCount(5);
        await expect(catalog.filtersColumnHeading()).toBeHidden();
        await catalog.openFilters();
        await expect(catalog.filtersColumnHeading()).toHaveText('Filters');
        await expect(catalog.filterEntries('Categories')).toHaveText(['Arts', 'Physics', 'Science']);
        await expect(catalog.filterEntries('Series')).toHaveText(['History']);

        // A category, not its sub-category; the category's own boxes, no
        // "Order Features" (Rules 3, 8; Fields).
        await catalog.chooseFilter('Science');
        await expect(catalog.shownTitles()).toHaveText(['Harbour Currents']);
        await expect(catalog.columnHeadings()).toHaveText(['Featured in category', 'New release in category']);
        await catalog.expectFeatured('Harbour Currents', false);
        await expect(catalog.addEntryButton()).toBeVisible();
        await expect(catalog.orderFeaturesButton()).toHaveCount(0);

        // Featured in the category (Rule 6).
        await catalog.pressFeatured('Harbour Currents');
        await catalog.expectFeatured('Harbour Currents', true);
        await expect(catalog.orderFeaturesButton()).toBeVisible();

        // Another category replaces the first (Rule 3).
        await catalog.chooseFilter('Arts');
        await expect(catalog.shownTitles()).toHaveText(['Tidal Patterns']);
        await catalog.expectFeatured('Tidal Patterns', true);
        await expect(catalog.clearFilterButton('Arts')).toBeVisible();
        await expect(catalog.clearFilterButton('Science')).toHaveCount(0);

        // "Clear filter": the whole catalog under "Featured" / "New release",
        // each book with its catalog-wide flag (Rules 3, 8).
        await catalog.clearFilter('Arts');
        await expect(catalog.clearFilterButton('Arts')).toHaveCount(0);
        await expect(catalog.rows()).toHaveCount(5);
        for (const title of all) {
            await expect(catalog.rowTitle(title)).toBeVisible();
        }
        await expect(catalog.columnHeadings()).toHaveText(['Featured', 'New release']);
        await catalog.expectFeatured('Harbour Currents', true);
        await catalog.expectFeatured('Tidal Patterns', false);

        // The column closed with a filter on: the filter stays (Rule 3).
        await catalog.chooseFilter('Science');
        await expect(catalog.shownTitles()).toHaveText(['Harbour Currents']);
        await catalog.closeFilters();
        await expect(catalog.shownTitles()).toHaveText(['Harbour Currents']);
        await expect(catalog.columnHeadings()).toHaveText(['Featured in category', 'New release in category']);

        // A series: its books under its own headings; featured in it (Rules 3, 6).
        await catalog.chooseFilter('History');
        await expect(catalog.rows()).toHaveCount(2);
        await expect(catalog.rowTitle('River Histories')).toBeVisible();
        await expect(catalog.rowTitle('Coastal Towns')).toBeVisible();
        await expect(catalog.columnHeadings()).toHaveText(['Featured in series', 'New release in series']);
        await catalog.expectFeatured('River Histories', false);
        await catalog.pressFeatured('River Histories');
        await catalog.expectFeatured('River Histories', true);

        // The series page: River Histories first, although Coastal Towns is
        // the newer (Rule 6a).
        await reader.gotoSeries('history');
        await expect(reader.allBooksTitles()).toHaveText(['River Histories', 'Coastal Towns']);

        // Search, in the whole catalog (Rules 3, 5; Fields).
        await catalog.chooseFilter('History');
        await expect(catalog.clearFilterButton('History')).toHaveCount(0);
        await expect(catalog.rows()).toHaveCount(5);
        await catalog.search('Tidal');
        await expect(catalog.shownTitles()).toHaveText(['Tidal Patterns']);
        await catalog.clearSearch();
        await expect(catalog.rows()).toHaveCount(5);
        await expect(catalog.searchBox()).toHaveValue('');
        await catalog.search('Reed');
        await expect(catalog.shownTitles()).toHaveText(['Harbour Currents']);
        await catalog.search('');
        await expect(catalog.rows()).toHaveCount(5);
        const number = String(wave.submissionId);
        await expect(catalog.rowNumber('Wave Mechanics')).toHaveText(number);
        await catalog.search(number);
        await expect(catalog.shownTitles()).toHaveText(['Wave Mechanics']);

        // Control: in the whole catalog River Histories' "Featured" box is
        // empty, and the public catalog puts Harbour Currents first (Rules 6a, 8).
        await catalog.clearSearch();
        await expect(catalog.rows()).toHaveCount(5);
        await expect(catalog.columnHeadings()).toHaveText(['Featured', 'New release']);
        await catalog.expectFeatured('River Histories', false);
        await catalog.expectFeatured('Harbour Currents', true);
        await reader.gotoCatalog();
        await expect(reader.titles()).toHaveCount(5);
        await expect(reader.titles().first()).toHaveText('Harbour Currents');
    });

    test('S5: A book\'s Catalog Entry page: series, cover and URL Path', async ({asUser, ompApi, visitor}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const {manager} = await seedPress(ompApi, tag, {series: [{path: 'history', title: 'History'}]});
        const harbour = await seedBook(ompApi, tag, 1, 'Harbour Currents', {published: true});
        await seedBook(ompApi, tag, 2, 'Tidal Patterns', {published: true, urlPath: 'harbour'});

        const page = await actorPage(asUser, manager);
        const catalog = new CatalogPage(page, tag);
        const workflow = new WorkflowPage(page, tag);
        const entry = new CatalogEntryPage(page, tag);
        const reader = new PublicCatalog(visitor, tag);

        // The page: heading, five groups top to bottom, "Save" at the foot,
        // an empty first "Series" choice (Fields, the Catalog Entry page).
        await catalog.openFromSideMenu();
        const bookAddress = await catalog.viewEntry('Harbour Currents').getAttribute('href');
        await catalog.viewSubmission('Harbour Currents').click();
        await workflow.expectOpen(harbour.submissionId);
        await entry.openFromWorkflow();
        await expect.poll(() => entry.groupNames(), {timeout: T}).toEqual(['Placement', 'Publication Timing', 'Version and Updates', 'Display', 'Access']);
        await expect(entry.saveButton()).toBeVisible();
        await expect(entry.footer().getByRole('button', {name: 'Save', exact: true})).toBeVisible();
        const accessBox = await entry.group('Access').boundingBox();
        const saveBox = await entry.saveButton().boundingBox();
        expect(saveBox.y, '"Save" stands below the last group').toBeGreaterThan(accessBox.y);
        await expect(entry.seriesOptions().first()).toHaveText('');
        await expect(entry.seriesSelect()).toHaveValue('');

        // Series and position saved: "Saving", then "Saved"; kept after a
        // reload; one "Submission metadata updated" line (Rule 13; Side effects bullet 3).
        const metadataLines = (lines) => lines.filter((line) => line.includes(METADATA_UPDATED)).length;
        const metadataLines0 = metadataLines(await activityLogLines(workflow));
        await entry.seriesSelect().selectOption({label: 'History'});
        await entry.seriesPositionBox().fill('Book 2');
        const saved = await entry.save();
        expect(saved.response.status()).toBe(200);
        expect(saved.sawSaving, '"Saving" showed beside the button').toBe(true);
        await entry.reload();
        await expect(entry.seriesSelect().locator('option:checked')).toHaveText('History');
        await expect(entry.seriesPositionBox()).toHaveValue('Book 2');
        expect(metadataLines(await activityLogLines(workflow)), 'one "Submission metadata updated" line more').toBe(metadataLines0 + 1);

        // Where the series shows: the Catalog page's filter, the series page
        // with "Book 2" above the title, not the book's page (Rules 13a, 13b).
        await catalog.goto();
        await catalog.chooseFilter('History');
        await expect(catalog.shownTitles()).toHaveText(['Harbour Currents']);
        await reader.gotoSeries('history');
        await expect(reader.allBooksTitles()).toHaveText(['Harbour Currents']);
        await expect(reader.seriesPosition('Harbour Currents')).toHaveText('Book 2');
        await reader.gotoBook(bookAddress);
        await expect(reader.bookTitle()).toHaveText('Harbour Currents');
        await expect(reader.bookRoot()).toContainText('History');
        await expect(reader.bookRoot()).not.toContainText('Book 2');

        // A cover: preview, "Alternate text", "Remove"; kept after a reload (Rule 13f; Fields).
        await workflow.gotoEditorial(harbour.submissionId);
        await entry.openFromWorkflow();
        await expect(entry.uploadFileButton()).toBeVisible();
        await expect(entry.coverPreview()).toHaveCount(0);
        await entry.uploadCover(path.join(FILES, 'profile-image-400.png'));
        await expect(entry.altTextBox()).toBeVisible();
        await expect(entry.removeCoverButton()).toBeVisible();
        await entry.altTextBox().fill('Cover of the book');
        expect((await entry.save()).response.status()).toBe(200);
        await entry.reload();
        await expect(entry.coverPreview()).toBeVisible();
        await expect(entry.altTextBox()).toHaveValue('Cover of the book');

        // The cover for readers: the small copy on the catalog and the book's page (Rule 13f; Settings bullet 4).
        await reader.gotoCatalog();
        expectSmallCopy(await reader.picture(reader.summaryCover('Harbour Currents')));
        await expect(reader.summaryCover('Harbour Currents')).toHaveAttribute('alt', 'Cover of the book');
        await reader.gotoBook(bookAddress);
        expectSmallCopy(await reader.picture(reader.bookCover()));

        // "Remove": "Upload File" and "Restore Original"; after "Save" the
        // book's page shows the default picture (Rule 13f; Fields).
        await entry.removeCoverButton().click();
        await expect(entry.uploadFileButton()).toBeVisible();
        await expect(entry.restoreOriginalButton()).toBeVisible();
        await expect(entry.coverPreview()).toHaveCount(0);
        expect((await entry.save()).response.status()).toBe(200);
        await reader.gotoBook(bookAddress);
        const fallback = await reader.picture(reader.bookCover());
        expect(fallback.src, 'the default picture').toMatch(/\/templates\/images\/book-default/);

        // URL Path refused, three ways, each with the form's notice; nothing
        // saved (Rule 13g).
        const refusals = [
            ['my book', 'This may only contain letters, numbers, dashes, underscores and periods.'],
            ['12345', 'The URL path can not be a number.'],
            ['harbour', 'The URL path has already been used and can not be used again.'],
        ];
        for (const [value, message] of refusals) {
            await expect(entry.notices().getByText(FORM_REFUSED)).toHaveCount(0, {timeout: 15_000});
            await entry.urlPathBox().fill(value);
            const refused = await entry.save();
            expect(refused.response.status(), `"${value}" is refused`).toBe(400);
            await expect(entry.group('Access')).toContainText(message);
            await expect(entry.notices().getByText(FORM_REFUSED)).toBeVisible();
        }
        await entry.reload();
        await expect(entry.urlPathBox()).toHaveValue('');

        // URL Path saved: "View Entry" opens the book at harbour-2 (Rule 13g).
        await entry.urlPathBox().fill('harbour-2');
        expect((await entry.save()).response.status()).toBe(200);
        await catalog.goto();
        await catalog.viewEntry('Harbour Currents').click();
        await expect(page).toHaveURL(/\/catalog\/book\/harbour-2$/);
        await expect(page.locator('.obj_monograph_full h1.title')).toHaveText('Harbour Currents');

        // Control: no series, then neither the series page nor the Catalog
        // page's "History" filter lists the book (Rules 1, 13a).
        await workflow.gotoEditorial(harbour.submissionId);
        await entry.openFromWorkflow();
        await entry.seriesSelect().selectOption({index: 0});
        expect((await entry.save()).response.status()).toBe(200);
        await reader.gotoSeries('history');
        await expect(reader.count()).toContainText('0 Titles');
        await expect(reader.summary('Harbour Currents')).toHaveCount(0);
        await catalog.goto();
        await catalog.chooseFilter('History');
        await expect(catalog.emptyLine()).toHaveText('No items found.');
        await expect(catalog.rows()).toHaveCount(0);
    });

    test('S6: Who may open the Catalog page', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const {manager, author} = await seedPress(ompApi, tag, {
            extra: [
                user(`${tag}se`, 'Sam', 'Series', ['sectionEditor']),
                user(`${tag}mk`, 'Mia', 'Marketing', ['marketing']),
                user(`${tag}rd`, 'Rae', 'Reader', ['reader']),
            ],
        });
        const address = `/index.php/${tag}/manageCatalog`;

        // The Series editor's side menu offers no "Catalog" (Actors row 1);
        // the positive control is the menu's own entries, read the same way.
        const sePage = await actorPage(asUser, `${tag}se`);
        await sePage.goto(`/index.php/${tag}/dashboard/editorial`);
        const seMenu = new EditorialSideMenu(sePage);
        await expect(seMenu.nav.locator('[role="treeitem"]').first()).toBeVisible({timeout: T});
        await expect(seMenu.nav.locator('[role="treeitem"][aria-label="Catalog"]')).toHaveCount(0);
        expect(await seMenu.contentEntries()).not.toContain('Catalog');

        // Other roles at the address: the access-denied page.
        for (const username of [`${tag}mk`, author, `${tag}rd`]) {
            const p = await actorPage(asUser, username);
            await p.goto(address);
            await expect(p).toHaveURL(/\/user\/authorizationDenied/);
            await expect(p.getByText(ACCESS_DENIED)).toBeVisible();
            await expect(p.locator('.listPanel--catalog')).toHaveCount(0);
        }

        // Signed out at the address: the Login page.
        await visitor.goto(address);
        await expect(visitor).toHaveURL(/\/login/);
        await expect(visitor.locator('input[name="username"]')).toBeVisible();

        // Control: the Press manager's "Content" › "Catalog" opens that
        // very address, headed "Catalog" (Actors row 1).
        const page = await actorPage(asUser, manager);
        const catalog = new CatalogPage(page, tag);
        await catalog.openFromSideMenu();
        expect(await new EditorialSideMenu(page).contentEntries()).toContain('Catalog');
        await expect(page).toHaveURL(new RegExp(`${address.replace(/\//g, '\\/')}$`));
        await expect(catalog.heading()).toHaveText('Catalog');
    });

    test('S7: the press side of the journal and preprint-server absence: the seeded press offers the catalog', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const book = await ompApi.createSubmission({
            tag,
            context: 'publicknowledge',
            submitter: 'author.alex',
            title: `Catalog control ${tag}`,
            decisions: PRODUCTION,
            published: true,
        });
        const page = await actorPage(asUser, 'manager.maya');
        const catalog = new CatalogPage(page, 'publicknowledge');

        // The side menu's "Content" › "Catalog" (Actors row 1).
        await catalog.openFromSideMenu();
        expect(await new EditorialSideMenu(page).contentEntries()).toContain('Catalog');

        // The press's address followed by "manageCatalog": the page headed "Catalog".
        await catalog.goto();
        await expect(page).toHaveURL(/\/publicknowledge\/(en\/)?manageCatalog/);
        await expect(catalog.heading()).toHaveText('Catalog');

        // The book's version lists "Catalog Entry".
        const workflow = new WorkflowPage(page, 'publicknowledge');
        await workflow.gotoEditorial(book.submissionId);
        expect(await workflow.pagesUnderLatestVersion()).toContain('Catalog Entry');

        // Its Production stage shows the "Catalog Management" notice (Rule 14).
        const modal = await openProduction(page, 'publicknowledge', book.submissionId);
        await expectPressNotice(modal, PRESS_NOTICES.catalog);
    });
});
