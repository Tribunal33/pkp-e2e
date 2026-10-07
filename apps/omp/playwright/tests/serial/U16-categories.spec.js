// @ts-check
/**
 * @file playwright/tests/serial/U16-categories.spec.js
 *
 * Categories — OMP suite, the serial part: S2, S5 and S6 (common), the
 * scenarios that read a published book on a category page, in the press's
 * words (Press Manager, books, "Titles", "All Books", the book's own page
 * at catalog/book/{id}). S1, S3, S4 and S8 are in ../U16-categories.spec.js,
 * whose header lists what the suite deliberately does not cover; on top of
 * it, here:
 * - U10 OMP2 🐞: S5 reads the press's first page of "Physics" (two books
 *   under "All Books"), never the missing page links.
 * - A12, A18 🐞: S2 types in the delete dialog's box by its place and never
 *   reads the "Select Categories" window's arrow column heading.
 * Spec: docs/specs/U16-categories.md
 *
 * Why serial: a category page lists the books the search index holds,
 * and the index is refreshed by a queued job the fleets never run on their
 * own (Rule 8a, footnote s), so each test publishes through the scenario
 * API and drains the queue with runJobs(), which pops the SHARED queue and
 * is only safe in the serial project (patterns.md parallel lesson 7). S6
 * asserts "not yet, until the jobs run", which another test's drain would
 * break, so it carries `@solo` and runs alone in the `omp-solo` project.
 *
 * Seeding: scratch presses with throwaway accounts (the username twice as
 * password), as footnote s says: `categories[]`, the books' `categories`
 * (the "Catalog Entry" page's field) and `published` by a throwaway
 * Author, S5 `itemsPerPage` and a submitted "Draft Theory" left in the
 * workflow; S5 also reads the seeded press's "Applied Science" (no count).
 * S2's delete and S6's "Unpublish" are pressed on screen. The visitor is a
 * browser context with an empty storage state (patterns.md, parallel
 * lesson 8). Every absence is read settled and paired with a positive
 * control taken the same way (M4, M6); S2's mailbox silence is bounded by
 * a "Reset Password" mail the visitor asks for, to the manager's own
 * throwaway address (A8).
 *
 * A category page the server answers with nothing fails the test like any
 * other crash: the PHP 8.3 OPcache crash (php-src GH-20469) these pages
 * met is worked around in pkp-lib since pkp/pkp-lib#12915 (2026-10-05),
 * so the re-open of a dropped answer is gone (test finding T-omp-2).
 */
const {test: base, expect} = require('../../support/fixtures.js');
const {runJobs} = require('../../../../../shared/playwright/support/jobs.js');
const {
    CategoriesTab,
    CategoryPicker,
    CategoryPage,
    PublicationEntryPage,
} = require('../../../../../shared/playwright/pages/CategoriesPages.js');
const {EditorialDashboardPage} = require('../../../../../shared/playwright/pages/EditorialDashboardPage.js');
const {TasksPanel} = require('../../../../../shared/playwright/pages/NotificationsPages.js');
const {unpublishFromWorkflow} = require('../../pages/PublicationPages.js');

const T = 30_000;

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
    return `u16${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/** A scratch press with a throwaway Press Manager (`${tag}mg`) and Author (`${tag}au`). */
async function seedPress(ompApi, tag, keys = {}) {
    await ompApi.createContext({
        tag,
        users: [user(`${tag}mg`, 'Mona', 'Manager', ['manager']), user(`${tag}au`, 'Ada', 'Author', ['author'])],
        ...keys,
    });
    return {manager: `${tag}mg`, author: `${tag}au`};
}

/** A book by the press's Author, placed in `categories` and published (unless `published: false`). */
async function seedBook(ompApi, tag, n, title, categories, {published = true} = {}) {
    return ompApi.createSubmission({
        tag: `${tag}b${n}`,
        context: tag,
        submitter: `${tag}au`,
        title,
        categories,
        ...(published ? {published: true} : {}),
    });
}

/**
 * A book's own page as the visitor reads it (catalog/book/{id}): its title
 * and the category links under "Categories".
 */
class BookPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        this.page = page;
        this.contextPath = contextPath;
    }

    async goto(submissionId) {
        await this.page.goto(`/index.php/${this.contextPath}/catalog/book/${submissionId}`);
        await expect(this.title()).toBeVisible({timeout: T});
    }

    root() {
        return this.page.locator('.obj_monograph_full');
    }

    title() {
        return this.root().locator('h1.title');
    }

    /** The "Categories" item of the page (absent with no category). */
    categories() {
        return this.root().locator('.item.categories');
    }

    categoryLinks() {
        return this.categories().locator('.value').getByRole('link');
    }
}

test.describe('Categories (queue-drained category pages)', () => {
    test('S2: Delete a category with sub-categories', async ({asUser, ompApi, pkpMail, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {manager, author} = await seedPress(ompApi, tag, {
            categories: [
                {path: 'arts', title: 'Arts'},
                {
                    path: 'history',
                    title: 'History',
                    children: [{path: 'modern-history', title: 'Modern History', children: [{path: 'cold-war', title: 'Cold War'}]}],
                },
            ],
        });
        const empires = await seedBook(ompApi, tag, 1, 'Empires', ['history']);
        const posters = await seedBook(ompApi, tag, 2, 'Wall Posters', ['cold-war', 'arts']);
        runJobs();

        // Before the delete, as the visitor reads them: "Empires" names
        // "History", "Wall Posters" names "Cold War" and "Arts" (the
        // controls of the later absences).
        const book = new BookPage(visitor, tag);
        await book.goto(empires.submissionId);
        await expect(book.categoryLinks()).toHaveText(['History']);
        await book.goto(posters.submissionId);
        await expect(book.categoryLinks()).toHaveCount(2);
        await expect(book.categoryLinks().filter({hasText: 'Cold War'})).toHaveCount(1);
        await expect(book.categoryLinks().filter({hasText: 'Arts'})).toHaveCount(1);

        // The manager's Tasks count and the two mailboxes before the delete.
        const page = await (await asUser(manager)).newPage();
        const tab = new CategoriesTab(page, tag);
        await tab.goto();
        await expect(tab.nameCells()).toHaveText(['Arts', 'History']);
        const tasks = new TasksPanel(page);
        await expect(tasks.bell()).toBeVisible();
        const tasksBefore = await tasks.count();
        const managerMailBefore = await pkpMail.count({to: mailOf(manager)});
        const authorMailBefore = await pkpMail.count({to: mailOf(author)});

        // The dialog (Fields, the delete dialog).
        let dialog = await tab.openDelete('History');
        await expect(page.getByRole('dialog', {name: 'Are you absolutely sure you want to delete "History" category?'})).toBeVisible();
        const box = dialog.root();
        await expect(box).toContainText('Warning: Deleting this category will remove all 2 sub-categories within it.');
        await expect(box).toContainText('This action cannot be undone. Deleting the category will:');
        await expect(dialog.points()).toHaveText([
            'Permanently remove all nested sub-categories',
            'Unassign this category from any submissions currently using it',
        ]);
        await expect(box).toContainText('This will not delete the submissions themselves — they will simply be left without a category.');
        await expect(box).toContainText('To confirm, please type the name of the category "History" below to proceed');
        await expect(dialog.confirmBox()).toBeVisible();
        await expect(dialog.deleteButton()).toHaveText('I understand the consequences, delete this category');
        await expect(dialog.deleteButton()).toBeDisabled();
        await expect(dialog.cancelButton()).toBeVisible();

        // "Cancel": the dialog closes, "History" stays (Rule 7).
        await dialog.cancel();
        await expect(tab.row('History')).toBeVisible();

        // The name typed: "history" leaves the button grayed out, "History"
        // makes it pressable (Rule 7).
        dialog = await tab.openDelete('History');
        await dialog.confirmBox().fill('history');
        await expect(dialog.confirmBox()).toHaveValue('history');
        await expect(dialog.deleteButton()).toBeDisabled();
        await dialog.confirmBox().fill('History');
        await expect(dialog.deleteButton()).toBeEnabled();

        // Deleted: the second dialog, then "Back to Categories" and the tab
        // without "History" (Rule 7).
        expect((await dialog.confirm()).status()).toBe(200);
        await expect(dialog.deletedDialog()).toBeVisible();
        await expect(dialog.deletedDialog()).toContainText('"History" and its 2 sub-categories have been successfully deleted.');
        await expect(dialog.deletedDialog()).toContainText(
            'All submissions previously tagged under these categories are now unassigned. You can reassign them from the submission details page.'
        );
        await dialog.backButton().click();
        await expect(dialog.deletedDialog()).toHaveCount(0);
        await expect(tab.nameCells()).toHaveText(['Arts']);

        // The visitor's side: "Empires" still opens and names no "History"
        // (no "Categories" at all); "Wall Posters" names "Arts" alone; the
        // three addresses answer the bare not-found page (Rules 7, 13; Side
        // effects).
        await book.goto(empires.submissionId);
        await expect(book.title()).toHaveText('Empires');
        await expect(book.root().getByRole('link', {name: 'History', exact: true})).toHaveCount(0);
        await expect(book.categories()).toHaveCount(0);
        await book.goto(posters.submissionId);
        await expect(book.title()).toHaveText('Wall Posters');
        await expect(book.categoryLinks()).toHaveText(['Arts']);
        const cat = new CategoryPage(visitor, tag);
        for (const path of ['history', 'modern-history', 'cold-war']) {
            await cat.expectBareNotFound(path);
        }

        // The submission lists' filter: "Select Categories" under
        // "Categories" lists "Arts" alone (Side effects).
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto('?currentViewId=active');
        const modal = await dash.openFilters();
        const window = await new CategoryPicker(page, modal).openWindow();
        expect((await window.read()).map((r) => r.name)).toEqual(['Arts']);
        await window.close();

        // No email, no notice: bounded by a "Reset Password" mail the
        // visitor asks for to the manager's address; the Tasks count is as
        // before (Side effects).
        await visitor.goto(`/index.php/${tag}/login/lostPassword`);
        await visitor.locator('form#lostPasswordForm input#email').fill(mailOf(manager));
        await visitor.locator('form#lostPasswordForm').getByRole('button', {name: 'Reset Password'}).click();
        await pkpMail.find({to: mailOf(manager), subject: 'Password Reset Confirmation'});
        expect(await pkpMail.count({to: mailOf(manager)})).toBe(managerMailBefore + 1);
        expect(await pkpMail.count({to: mailOf(author)})).toBe(authorMailBefore);
        await tab.goto();
        await tasks.expectCount(tasksBefore);

        // Control: "Arts", never deleted, still opens and lists "Wall
        // Posters" (Rule 7).
        await cat.goto('arts');
        await expect(cat.heading()).toHaveText('Arts');
        await expect(cat.itemTitles()).toHaveText(['Wall Posters']);
    });

    test('S5: A visitor browses by category', async ({ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        await seedPress(ompApi, tag, {
            itemsPerPage: 2,
            categories: [
                {
                    path: 'science',
                    title: 'Science',
                    children: [
                        {path: 'astronomy', title: 'Astronomy'},
                        {path: 'physics', title: 'Physics'},
                    ],
                },
            ],
        });
        await seedBook(ompApi, tag, 1, 'Sun Study', ['science']);
        await seedBook(ompApi, tag, 2, 'Moon Study', ['science']);
        await seedBook(ompApi, tag, 3, 'Alpha Result', ['physics']);
        await seedBook(ompApi, tag, 4, 'Beta Result', ['physics']);
        await seedBook(ompApi, tag, 5, 'Gamma Result', ['physics']);
        await seedBook(ompApi, tag, 6, 'Draft Theory', ['physics'], {published: false});
        runJobs();
        const cat = new CategoryPage(visitor, tag);
        const results = ['Alpha Result', 'Beta Result', 'Gamma Result'];
        const allBooks = () => cat.root().getByRole('heading', {name: 'All Books', exact: true});

        // A parent's page: breadcrumb, heading, "Subcategories", its own two
        // books (Rules 2, 8, 11).
        await cat.goto('science');
        expect(await cat.crumbs()).toEqual(['Home', 'Science']);
        await expect(cat.crumbLinks()).toHaveText(['Home']);
        await expect(cat.crumbLink('Home')).toHaveAttribute('href', new RegExp(`/index\\.php/${tag}(/index)?$`));
        await expect(cat.currentCrumb()).toHaveText('Science');
        await expect(cat.heading()).toHaveText('Science');
        await expect(cat.subcategoryLinks()).toHaveText(['Astronomy', 'Physics']);
        await expect(cat.itemTitles()).toHaveCount(2);
        expect((await cat.itemTitles().allInnerTexts()).map((t) => t.trim()).sort()).toEqual(['Moon Study', 'Sun Study']);

        // A sub-category's page: breadcrumb with "Science" a link, no
        // "Subcategories"; on a press "3 Titles" and the heading "All Books"
        // over the first two books (Rules 8, 9, 11; the missing page links
        // are U10's OMP2 and not read).
        await cat.subcategories().getByRole('link', {name: 'Physics', exact: true}).click();
        await expect(cat.heading()).toHaveText('Physics');
        expect(await cat.crumbs()).toEqual(['Home', 'Science', 'Physics']);
        await expect(cat.crumbLinks()).toHaveText(['Home', 'Science']);
        await expect(cat.count()).toHaveText('3 Titles');
        await expect(cat.subcategories()).toHaveCount(0);
        await expect(allBooks()).toBeVisible();
        await expect(cat.itemTitles()).toHaveCount(2);
        const first = (await cat.itemTitles().allInnerTexts()).map((t) => t.trim());
        expect(first.every((t) => results.includes(t)), `the two listed are of the three (${first})`).toBe(true);
        await expect(cat.item('Draft Theory')).toHaveCount(0);

        // Back up the breadcrumb: "Science" opens its page (Rule 11).
        await cat.crumbLink('Science').click();
        await expect(cat.heading()).toHaveText('Science');
        await expect(visitor).toHaveURL(/\/category\/science$/);

        // Control: "Draft Theory", still in the workflow, is on neither page
        // (the two listed books are the read), and "Physics" counts 3 (Rule 8).
        await expect(cat.itemTitles()).toHaveCount(2);
        await expect(cat.item('Draft Theory')).toHaveCount(0);

        // An unknown address: the bare not-found page (Rule 13).
        await cat.expectBareNotFound('nowhere');

        // The seeded press's pages {OMP}: "Applied Science" headed, its
        // breadcrumb, a count ending in "Titles", "Subcategories" with
        // "Computer Science" and "Engineering" (Rule 9; no count is read).
        const seeded = new CategoryPage(visitor, 'publicknowledge');
        await seeded.goto('applied-science', {locale: 'en'});
        await expect(seeded.heading()).toHaveText('Applied Science');
        expect(await seeded.crumbs()).toEqual(['Home', 'Applied Science']);
        await expect(seeded.count()).toHaveText(/^\s*\d+ Titles\s*$/);
        await expect(seeded.subcategoryLinks()).toHaveText(['Computer Science', 'Engineering']);
    });

    test('S6: An article joins and leaves a category\'s page @solo', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const {manager} = await seedPress(ompApi, tag, {categories: [{path: 'science', title: 'Science'}]});
        await seedBook(ompApi, tag, 1, 'Sun Study', ['science']);
        const moon = await seedBook(ompApi, tag, 2, 'Moon Study', ['science']);
        runJobs();
        const late = await seedBook(ompApi, tag, 3, 'Late Study', ['science']);
        const cat = new CategoryPage(visitor, tag);
        const book = new BookPage(visitor, tag);
        const titles = async () => (await cat.itemTitles().allInnerTexts()).map((t) => t.trim()).sort();

        // Before the jobs run: "2 Titles", "Sun Study" and "Moon Study" only;
        // "Late Study"'s own page already names "Science" (Rule 8a).
        await cat.goto('science');
        await expect(cat.count()).toHaveText('2 Titles');
        await expect(cat.itemTitles()).toHaveCount(2);
        expect(await titles()).toEqual(['Moon Study', 'Sun Study']);
        await expect(cat.item('Late Study')).toHaveCount(0);
        await book.goto(late.submissionId);
        await expect(book.categoryLinks()).toHaveText(['Science']);

        // After the jobs run: "3 Titles", "Late Study" listed too (Rule 8a).
        runJobs();
        await cat.goto('science');
        await expect(cat.count()).toHaveText('3 Titles');
        await expect(cat.itemTitles()).toHaveCount(3);
        expect(await titles()).toEqual(['Late Study', 'Moon Study', 'Sun Study']);

        // Unpublished (Press Manager): the page reloaded at once reads "2
        // Titles" without "Moon Study" (Rule 8a).
        const page = await (await asUser(manager)).newPage();
        const entry = new PublicationEntryPage(page, tag, {entry: 'Title & Abstract'});
        await entry.goto(moon.submissionId);
        await unpublishFromWorkflow(page);
        await cat.reload();
        await expect(cat.count()).toHaveText('2 Titles');
        await expect(cat.itemTitles()).toHaveCount(2);
        expect(await titles()).toEqual(['Late Study', 'Sun Study']);

        // Control: "Sun Study" stayed listed throughout (Rule 8).
        await expect(cat.item('Sun Study')).toHaveCount(1);
    });
});
