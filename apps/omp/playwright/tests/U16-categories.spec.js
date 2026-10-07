// @ts-check
/**
 * @file playwright/tests/U16-categories.spec.js
 *
 * Categories — OMP suite, the parallel part: one test per canonical
 * scenario a press runs without reading a published book on a category
 * page, S1, S3, S4 (common) and S8 ({OMP}, the press's "Browse" block), in
 * the press's own words: the Press Manager, Settings › Press ›
 * "Categories", a book's "Catalog Entry" page, the Series Editor, "Order of
 * monographs", "Press editor", "Titles". S2, S5 and S6 wait on the site's
 * background jobs and are in serial/U16-categories.spec.js; S7 is {OJS
 * OPS} and costs the press no test.
 * Spec: docs/specs/U16-categories.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - OMP1 🐞: S1 uploads a "Cover Image" and never reads the picture on the
 *   press's category page (only its description).
 * - OMP2 🐞: S8 reads the block's category links as a set and the
 *   sub-category's indent, never their order or where "Physics" stands.
 * - OMP3 🐞: S8 reads "Browse" as the block's text, never as a heading.
 * - OMP4 🐞: no test unticks all three of the block's "Settings" boxes.
 * - A1 🐞: S1 reads "0 Titles" and no book; whether "No titles have been
 *   published yet." shows is never asserted.
 * - A9 🐞: S1 asserts that "my arts" is refused with a message under
 *   "Path", never the message's words.
 * - A11 🐞: S1 presses the arrows with the pointer only.
 * - A12, A15, A16, A17, A19 🐞, A3, A4, A5, A14 ❓: no test reaches those
 *   states or reads those parts.
 * - A2, A6, A7, A8, A13 🐞: no test sets another order, follows or reads
 *   the picture, types a "/" path, or submits with an editor ticked.
 * - A10, A18, A20, OPS1: the journal's and preprint server's block and
 *   breadcrumb, the delete dialog's box (serial S2 types in it), and the
 *   preprint server's window.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are only read. Every scenario runs on its own scratch press with
 * throwaway accounts (the username twice as password), as footnote s says:
 * S1 English and French under "UI" and "Forms" (`context.supportedLocales`,
 * `supportedFormLocales`), an `editor` "Eve Editor" (a Press editor) and a
 * book taken to Production by `decisions`; S3 the tree (`categories[]`)
 * and a Series Editor (`sectionEditor`) in the book's `participants[]`;
 * S4 two categories and an Author's `submitted: false` draft carrying its
 * Book Manuscript (`files[]`), the "Categories" setting left as a new press
 * has it and changed on screen; S8 the tree, the "Browse Block" enabled
 * with its three boxes ticked as a new press has it (seed-facts), the
 * sidebar box and the block's "Settings" changed on screen. The visitor is
 * a browser context with an empty storage state (patterns.md, parallel
 * lesson 8); every signed-in actor gets its own `asUser` context. Every
 * absence is read settled and paired with a positive control taken the
 * same way (M4, M6). Everything here runs in the parallel `omp` project.
 *
 * A category page the server answers with nothing fails the test like any
 * other crash: the PHP 8.3 OPcache crash (php-src GH-20469) these pages
 * met is worked around in pkp-lib since pkp/pkp-lib#12915 (2026-10-05),
 * so the re-open of a dropped answer is gone (test finding T-omp-2).
 */
const path = require('path');
const {test: base, expect} = require('../support/fixtures.js');
const {
    CategoriesTab,
    CategoryWindow,
    CategoryPicker,
    CategoryPage,
    BrowseBlock,
    BrowseBlockSettings,
    PublicationEntryPage,
} = require('../../../../shared/playwright/pages/CategoriesPages.js');
const {PluginsTab} = require('../../../../shared/playwright/pages/CustomContentPages.js');
const {WebsiteSettings} = require('../../../../shared/playwright/pages/AppearancePages.js');
const {EditorialDashboardPage} = require('../../../../shared/playwright/pages/EditorialDashboardPage.js');
const wizard = require('../pages/SubmissionWizardPages.js');

const PRODUCTION = ['skipExternalReview', 'sendToProduction'];
const FILES = path.join(__dirname, '..', 'fixtures', 'files');
const ENTRY = {entry: 'Catalog Entry'};
const EVE_BOX = 'Assign Eve Editor as Press editor';
const REQUIRED = 'This field is required.';
const AS = 'Applied Science';
const CS = 'Applied Science > Computer Science';
const CV = 'Applied Science > Computer Science > Computer Vision';
const ENG = 'Applied Science > Engineering';

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

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/**
 * A scratch press with a throwaway Press Manager (`${tag}mg`) and Author
 * (`${tag}au`), plus `extra` accounts and context keys.
 */
async function seedPress(ompApi, tag, {extra = [], ...keys} = {}) {
    await ompApi.createContext({
        tag,
        users: [user(`${tag}mg`, 'Mona', 'Manager', ['manager']), user(`${tag}au`, 'Ada', 'Author', ['author']), ...extra],
        ...keys,
    });
    return {manager: `${tag}mg`, author: `${tag}au`};
}

/** A page of an actor's own signed-in browser context. */
async function actorPage(asUser, username) {
    return (await asUser(username)).newPage();
}

/**
 * A window that opens from the right: its right edge on the viewport's, its
 * left edge in from the left, read once its slide-in has settled (a read
 * mid-slide under load put the right edge 1100 px short).
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

/**
 * The manager's "Active submissions" filtered by one category through the
 * "Filters" window's "Categories" field: `typed` in the box, the
 * suggestion `line` chosen, "Apply Filters", bounded by the list's reload.
 */
async function filterByCategory(page, contextPath, typed, line) {
    const dash = new EditorialDashboardPage(page, contextPath);
    await dash.goto('?currentViewId=active');
    await dash.expectViewHeading('Active submissions');
    const modal = await dash.openFilters();
    const picker = new CategoryPicker(page, modal);
    await picker.choose(typed, line);
    const reloaded = dash.listReload();
    await dash.applyFilters();
    await reloaded;
    await expect(dash.filterChipButton(`Categories: ${line}`)).toBeVisible();
    return dash;
}

test.describe('Categories', () => {
    test('S1: Build the category tree', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const {manager, author} = await seedPress(ompApi, tag, {
            context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
            extra: [user(`${tag}ed`, 'Eve', 'Editor', ['editor'])],
        });
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: `Placement ${tag}`,
            decisions: PRODUCTION,
        });
        const page = await actorPage(asUser, manager);
        const tab = new CategoriesTab(page, tag);
        const entry = new PublicationEntryPage(page, tag, ENTRY);
        const picker = new CategoryPicker(page);
        const placement = page.getByRole('group', {name: 'Placement'});

        // A press with no category: the table headed "Categories", "Add
        // Category", the two columns, "No Items".
        await tab.goto();
        await expect(tab.addButton()).toBeVisible();
        await expect(tab.columnHeader('Category Name')).toBeVisible();
        await expect(tab.columnHeader('Assigned To')).toBeVisible();
        await expect(tab.nameCells()).toHaveText(['No Items']);

        // The book's "Catalog Entry" has no "Categories" field; the
        // "Placement" group's "Series" is the control that the form is there.
        await entry.goto(submissionId);
        await expect(placement.getByRole('combobox', {name: 'Series'})).toBeVisible();
        await expect(picker.field()).toHaveCount(0);
        await expect(page.getByRole('button', {name: 'Select Categories', exact: true})).toHaveCount(0);

        // The window, and a save with nothing typed: refused in the browser,
        // the messages under "Name" and "Path", the summary with its two
        // "Go to" links, the window still open (Fields; Rule 4).
        await tab.goto();
        let win = await tab.openAdd();
        await expect(win.heading()).toBeVisible();
        await expectFromRight(page, win.root());
        await expect(win.saveButton()).toBeVisible();
        await expect(win.languageButton('French')).toBeVisible();
        await expect(win.field('Name')).toContainText('0/2 languages completed');
        await expect(win.field('Description')).toContainText('0/2 languages completed');
        const sent = await win.saveRefusedInPlace(win.errorSummary().filter({hasText: 'Please correct 2 errors.'}));
        expect(sent, 'nothing sent').toBe(0);
        await expect(win.fieldErrors('Name').first()).toHaveText(REQUIRED);
        await expect(win.fieldErrors('Path').first()).toHaveText(REQUIRED);
        await expect(win.goToButton('Name')).toBeVisible();
        await expect(win.goToButton('Path')).toBeVisible();
        await expect(win.heading()).toBeVisible();

        // The window's fields, in two languages (Fields): "Order of
        // monographs" on "Publication date (newest first)", "Press editor"
        // with Eve's one box, unticked.
        await win.languageButton('French').click();
        await expect(win.label('Name in French')).toBeVisible();
        await expect(win.label('Description in French')).toBeVisible();
        await expect(win.field('Path')).toContainText(
            new RegExp(`The category's URL will be: \\S*/index\\.php/${tag}/(en/)?catalog/category/path`)
        );
        await expect(win.label('Order of monographs')).toBeVisible();
        expect(await win.orderChosen()).toBe('Publication date (newest first)');
        await expect(win.root()).toContainText(
            'Select the editorial users who should be assigned automatically to all new submissions to this category.'
        );
        await expect(win.root().getByText('Press editor', {exact: true})).toBeVisible();
        await expect(win.editorBoxes()).toHaveCount(1);
        await expect(win.editorBox(EVE_BOX)).not.toBeChecked();

        // A top-level category: saved, the window closes, "Category saved",
        // "Science" listed with "Eve Editor" under "Assigned To" (Rule 4).
        await win.nameBox('en').fill('Science');
        await win.nameBox('fr_CA').fill('Sciences');
        await win.pathBox().fill('science');
        await win.editorBox(EVE_BOX).check();
        expect((await win.save()).status()).toBe(200);
        await expect(win.root()).toHaveCount(0);
        await expect(tab.savedNotice()).toBeVisible();
        await expect(tab.assignedTo('Science')).toHaveText('Eve Editor');

        // Refused paths: a path taken, then one with a space; "arts" saves
        // (Fields, "Path"; Rule 4).
        win = await tab.openAdd();
        await win.nameBox('en').fill('Arts');
        await win.pathBox().fill('science');
        expect((await win.save()).status()).toBe(400);
        await expect(win.fieldErrors('Path').first()).toHaveText('The category path already exists. Please enter a unique path.');
        await expect(win.heading()).toBeVisible();
        await win.pathBox().fill('my arts');
        expect((await win.save()).status()).toBe(400);
        await expect(win.fieldErrors('Path').first()).not.toHaveText(/already exists/);
        await expect(win.fieldErrors('Path').first()).toHaveText(/\S/);
        await expect(win.heading()).toBeVisible();
        await win.pathBox().fill('arts');
        expect((await win.save()).status()).toBe(200);
        await expect(win.root()).toHaveCount(0);
        await expect(tab.row('Arts')).toBeVisible();

        // A path in capitals: "Crafts" with "ARTS" saves beside "Arts".
        win = await tab.openAdd();
        await win.nameBox('en').fill('Crafts');
        await win.pathBox().fill('ARTS');
        expect((await win.save()).status()).toBe(200);
        await expect(win.root()).toHaveCount(0);
        await expect(tab.row('Crafts')).toBeVisible();

        // Sub-categories: the row menu, its "Add" window naming no parent,
        // the parent's row opened on the new row, indented (Rules 1, 3).
        await tab.openMenu('Science');
        await expect(tab.menuItems()).toHaveText(['Add', 'Edit', 'Delete Category']);
        await page.getByRole('menuitem', {name: 'Add', exact: true}).click();
        win = new CategoryWindow(page, 'Add Category');
        await win.expectOpen();
        await expect(win.heading()).toBeVisible();
        await expect(win.root()).not.toContainText('Science');
        await win.nameBox('en').fill('Physics');
        await win.pathBox().fill('physics');
        expect((await win.save()).status()).toBe(200);
        await expect(win.root()).toHaveCount(0);
        await expect(tab.nameCells()).toHaveText(['Arts', 'Crafts', 'Science', 'Physics']);
        expect(await tab.indent('Physics')).toBeGreaterThan(await tab.indent('Science'));
        win = await tab.openRowAdd('Physics');
        await win.nameBox('en').fill('Optics');
        await win.pathBox().fill('optics');
        expect((await win.save()).status()).toBe(200);
        await expect(win.root()).toHaveCount(0);
        await expect(tab.nameCells()).toHaveText(['Arts', 'Crafts', 'Science', 'Physics', 'Optics']);
        expect(await tab.indent('Optics')).toBeGreaterThan(await tab.indent('Physics'));

        // The arrows: a reload closes every row; each level opens on its
        // own; closing a parent hides everything under it, and reopening it
        // shows the level below as it was left (Rules 2, 3).
        await tab.reload();
        await expect(tab.nameCells()).toHaveText(['Arts', 'Crafts', 'Science']);
        await tab.toggle('Science');
        await expect(tab.nameCells()).toHaveText(['Arts', 'Crafts', 'Science', 'Physics']);
        await tab.toggle('Physics');
        await expect(tab.nameCells()).toHaveText(['Arts', 'Crafts', 'Science', 'Physics', 'Optics']);
        await tab.toggle('Science');
        await expect(tab.nameCells()).toHaveText(['Arts', 'Crafts', 'Science']);
        await tab.toggle('Science');
        await expect(tab.nameCells()).toHaveText(['Arts', 'Crafts', 'Science', 'Physics', 'Optics']);

        // Edit: the window filled with the saved values, the editor ticked;
        // a description, a picture and a new path saved (Rules 4, 6).
        win = await tab.openEdit('Science');
        await expect(win.heading()).toBeVisible();
        await expect(win.nameBox('en')).toHaveValue('Science');
        await expect(win.pathBox()).toHaveValue('science');
        await expect(win.editorBox(EVE_BOX)).toBeChecked();
        await win.languageButton('French').click();
        await expect(win.nameBox('fr_CA')).toHaveValue('Sciences');
        await win.typeDescription('Work in the natural sciences.');
        await win.uploadCover(path.join(FILES, 'profile-image-400.png'));
        await win.pathBox().fill('natural-science');
        expect((await win.save()).status()).toBe(200);
        await expect(win.root()).toHaveCount(0);
        await expect(tab.savedNotice()).toBeVisible();

        // The visitor's page: breadcrumb, heading, the description,
        // "Subcategories" with "Physics" alone (Rules 11, 12; the picture is
        // OMP1's and not read).
        const cat = new CategoryPage(visitor, tag);
        await cat.goto('natural-science');
        expect(await cat.crumbs()).toEqual(['Home', 'Science']);
        await expect(cat.crumbLinks()).toHaveText(['Home']);
        await expect(cat.currentCrumb()).toHaveText('Science');
        await expect(cat.heading()).toHaveText('Science');
        await expect(cat.description()).toHaveText('Work in the natural sciences.');
        await expect(cat.subcategories().getByRole('heading')).toHaveText('Subcategories');
        await expect(cat.subcategoryLinks()).toHaveText(['Physics']);

        // Nothing listed yet: "0 Titles" and no book (Rule 9; A1 is not
        // asserted either way).
        await expect(cat.count()).toHaveText('0 Titles');
        await expect(cat.items()).toHaveCount(0);

        // The old address answers the bare not-found page; "arts" and
        // "ARTS" open their own categories (Rules 5, 13).
        await cat.expectBareNotFound('science');
        await cat.goto('arts');
        await expect(cat.heading()).toHaveText('Arts');
        await cat.goto('ARTS');
        await expect(cat.heading()).toHaveText('Crafts');

        // Control: "Catalog Entry", reloaded, now holds "Categories" under
        // "Placement", "Selected: None" and "Select Categories".
        await entry.goto(submissionId);
        await page.reload();
        await expect(picker.label()).toBeVisible({timeout: 30_000});
        await expect(picker.groupHeading()).toHaveText('Placement');
        await expect(picker.field()).toContainText('Selected: None');
        await expect(picker.selectButton()).toBeVisible();
    });

    test('S3: Place an article in categories', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const seriesEditor = `${tag}se`;
        const {manager, author} = await seedPress(ompApi, tag, {
            extra: [user(seriesEditor, 'Sol', 'Seriesed', ['sectionEditor'])],
            categories: [
                {path: 'arts', title: 'Arts'},
                {
                    path: 'applied-science',
                    title: 'Applied Science',
                    children: [
                        {path: 'computer-science', title: 'Computer Science', children: [{path: 'computer-vision', title: 'Computer Vision'}]},
                        {path: 'engineering', title: 'Engineering'},
                    ],
                },
            ],
        });
        const title = `Vision Book ${tag}`;
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title,
            decisions: PRODUCTION,
            participants: [{username: seriesEditor, role: 'sectionEditor'}],
        });
        const managerPage = await actorPage(asUser, manager);

        // Control: the "Arts" filter, applied before the page's "Save", does
        // not list the book (Rule 17); the empty list is its read.
        let dash = await filterByCategory(managerPage, tag, 'Arts', 'Arts');
        await expect(dash.emptyState()).toBeVisible();
        await expect(dash.row(title)).toHaveCount(0);

        // The field (Series Editor): under "Placement", its line, "Selected:
        // None", "Select Categories" (Fields, the picker).
        const page = await actorPage(asUser, seriesEditor);
        const browserDialogs = [];
        page.on('dialog', (d) => {
            browserDialogs.push(d.type());
            d.accept().catch(() => {});
        });
        const entry = new PublicationEntryPage(page, tag, ENTRY);
        const picker = new CategoryPicker(page);
        await entry.goto(submissionId);
        await expect(picker.label()).toBeVisible();
        await expect(picker.groupHeading()).toHaveText('Placement');
        await expect(picker.description()).toHaveText('Assign categories to help organize and filter this publication.');
        await expect(picker.field()).toContainText('Selected: None');
        await expect(picker.selectButton()).toBeVisible();

        // Typing: the lines containing the letters, any case; a chosen line
        // is a chip with its "Remove" button and is not offered again
        // (Rule 16).
        await picker.type('sci');
        await expect(picker.options()).toHaveText([AS, CS, CV, ENG]);
        await picker.options().filter({hasText: new RegExp(`^\\s*${CV}\\s*$`)}).click();
        await expect(picker.removeButton(CV)).toBeVisible();
        await expect(picker.field()).toContainText(`Selected: ${CV}`);
        expect(await picker.chipLines()).toEqual([CV]);
        await picker.type('SCI');
        await expect(picker.options()).toHaveText([AS, CS, ENG]);
        await picker.clearTyping();

        // Leaving without saving: nothing asks, and the field is back at
        // "Selected: None" (Rule 16b).
        await entry.openPage('Title & Abstract');
        await entry.openPage();
        await expect(picker.label()).toBeVisible();
        await expect(picker.field()).toContainText('Selected: None');
        await expect(picker.removeButtons()).toHaveCount(0);
        expect(browserDialogs).toEqual([]);

        // The "Select Categories" window: the five as a tree, top-level
        // names bold, every branch open, nothing ticked; two ticked and saved
        // are the field's two chips (Fields; Rule 16a).
        let win = await picker.openWindow();
        await expectFromRight(page, win.root());
        await expect(win.nameHeader()).toBeVisible();
        expect(await win.read()).toEqual([
            {name: 'Applied Science', bold: true, checked: false, visible: true},
            {name: 'Computer Science', bold: false, checked: false, visible: true},
            {name: 'Computer Vision', bold: false, checked: false, visible: true},
            {name: 'Engineering', bold: false, checked: false, visible: true},
            {name: 'Arts', bold: true, checked: false, visible: true},
        ]);
        await win.box('Computer Vision').check();
        await win.box('Arts').check();
        await win.save();
        await expect(picker.removeButtons()).toHaveCount(2);
        expect((await picker.chipLines()).sort()).toEqual(['Arts', CV].sort());

        // The window's "Close": the ticks show the chips; an untick closed
        // away leaves both chips (Rule 16a).
        win = await picker.openWindow();
        await expect(win.box('Arts')).toBeChecked();
        await expect(win.box('Computer Vision')).toBeChecked();
        await win.box('Arts').uncheck();
        await win.close();
        await expect(picker.removeButtons()).toHaveCount(2);
        expect((await picker.chipLines()).sort()).toEqual(['Arts', CV].sort());

        // Saved: the page's "Save" (a press has no "Issue Assignment"), then
        // a reload shows the two chips (Rule 16b).
        expect((await entry.save()).status()).toBe(200);
        await page.reload();
        await expect(picker.label()).toBeVisible({timeout: 30_000});
        await expect(picker.removeButtons()).toHaveCount(2);
        expect((await picker.chipLines()).sort()).toEqual(['Arts', CV].sort());

        // The filter (Press Manager): "Arts" lists the book, "Computer
        // Vision" alone lists it, its parent "Applied Science" alone does
        // not (Rule 17).
        dash = await filterByCategory(managerPage, tag, 'Arts', 'Arts');
        await expect(dash.row(title)).toHaveCount(1);
        dash = await filterByCategory(managerPage, tag, 'Vision', CV);
        await expect(dash.row(title)).toHaveCount(1);
        dash = await filterByCategory(managerPage, tag, 'Applied', AS);
        await expect(dash.emptyState()).toBeVisible();
        await expect(dash.row(title)).toHaveCount(0);
    });

    test('S4: The author picks categories while submitting', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const {manager, author} = await seedPress(ompApi, tag, {
            categories: [
                {path: 'arts', title: 'Arts'},
                {path: 'science', title: 'Science'},
            ],
        });
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: `Draft ${tag}`,
            submitted: false,
            files: [{file: 'article.pdf'}],
        });

        // The Author on "For the Editors" of the draft. Control: before the
        // manager's "Save" the step has no "Categories" field; "Cover Note to
        // Editor" is the step's own control (Settings bullet 1).
        const authorPage = await actorPage(asUser, author);
        const picker = new CategoryPicker(authorPage);
        await authorPage.goto(wizard.wizardUrl(tag, submissionId));
        await wizard.expectWizardOpen(authorPage);
        await wizard.continueTo(authorPage, wizard.STEPS.details);
        await wizard.continueTo(authorPage, wizard.STEPS.contributors);
        await wizard.continueTo(authorPage, wizard.STEPS.editors);
        await expect(authorPage.getByText('Cover Note to Editor', {exact: true}).first()).toBeVisible();
        await expect(picker.field()).toHaveCount(0);
        await expect(authorPage.getByRole('button', {name: 'Select Categories', exact: true})).toHaveCount(0);

        // The setting (Press Manager): "No, do not show authors this
        // field."; "Yes, …" chosen and saved (Settings bullet 1).
        const page = await actorPage(asUser, manager);
        await page.goto(`/index.php/${tag}/management/settings/workflow`);
        await page.locator('#metadata-button').click();
        const no = page.getByRole('radio', {name: 'No, do not show authors this field.', exact: true});
        const yes = page.getByRole('radio', {name: 'Yes, add a categories field to the submission wizard.', exact: true});
        await expect(no).toBeVisible({timeout: 30_000});
        const metadataForm = page.locator('form').filter({has: no});
        await expect(metadataForm).toContainText(
            'Should the submitting author be asked to select a category when they make a new submission?'
        );
        await expect(no).toBeChecked();
        await expect(yes).not.toBeChecked();
        await yes.check();
        const saved = page.waitForResponse(
            (r) => r.url().includes('/api/v1/contexts/') && r.request().method() === 'POST',
            {timeout: 30_000}
        );
        await metadataForm.getByRole('button', {name: 'Save', exact: true}).click();
        expect((await saved).status()).toBe(200);
        await expect(metadataForm.locator('[role="status"]').filter({hasText: 'Saved'}).first()).toBeVisible({timeout: 30_000});

        // The Author's step, reloaded: the reload reopens the wizard on
        // "Upload Files" (T-omp-1, as T-ojs-2 and T-ops-1), so the Author
        // presses "Continue" back to the step, which now holds "Categories",
        // its line, "Selected: None", "Select Categories" (Fields, the
        // picker; Actors row 3).
        await authorPage.reload();
        await wizard.expectWizardOpen(authorPage);
        await wizard.expectStep(authorPage, wizard.STEPS.files);
        await wizard.continueTo(authorPage, wizard.STEPS.details);
        await wizard.continueTo(authorPage, wizard.STEPS.contributors);
        await wizard.continueTo(authorPage, wizard.STEPS.editors);
        await expect(picker.label()).toBeVisible({timeout: 30_000});
        await expect(picker.description()).toHaveText('Select only the categories that are appropriate for your submission.');
        await expect(picker.field()).toContainText('Selected: None');
        await expect(picker.selectButton()).toBeVisible();

        // A category picked: "ar" offers "Arts"; chosen, a chip "Arts" with
        // "Remove Arts" (Rule 16).
        await picker.type('ar');
        await expect(picker.options()).toHaveText(['Arts']);
        await picker.options().first().click();
        await expect(picker.removeButton('Arts')).toBeVisible();
        expect(await picker.chipLines()).toEqual(['Arts']);

        // "Review" lists "Categories" with "Arts".
        await wizard.openReview(authorPage);
        await expect(wizard.reviewPanel(authorPage, 'For the Editors')).toContainText(/Categories\s*Arts/);

        // The editor's side: submitted, the new submission's "Catalog Entry"
        // holds the chip "Arts" (Rules 16, 18).
        await wizard.confirmSubmit(authorPage);
        const entry = new PublicationEntryPage(page, tag, ENTRY);
        const placed = new CategoryPicker(page);
        await entry.goto(submissionId);
        await expect(placed.label()).toBeVisible();
        await expect(placed.removeButtons()).toHaveCount(1);
        expect(await placed.chipLines()).toEqual(['Arts']);
    });

    test('S8: The press\'s "Browse" block', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const {manager} = await seedPress(ompApi, tag, {
            categories: [
                {path: 'arts', title: 'Arts'},
                {path: 'science', title: 'Science', children: [{path: 'physics', title: 'Physics'}]},
            ],
        });
        const cat = new CategoryPage(visitor, tag);
        const block = new BrowseBlock(visitor);
        const names = async () => (await block.flatEntries()).map((e) => e.name).sort();

        // Control: before the "Save" the visitor's "Arts" page has no
        // "Browse" block (Settings bullet 7); the page's heading is the read.
        await cat.goto('arts');
        await expect(cat.heading()).toHaveText('Arts');
        await expect(block.root()).toHaveCount(0);

        // Placed: "Sidebar" holds "Browse Block", unticked; ticked and saved
        // (Settings bullet 7).
        const page = await actorPage(asUser, manager);
        const settings = new WebsiteSettings(page, tag, {thumbnailField: 'pressThumbnail'});
        await settings.goto();
        const setup = await settings.open('appearance-setup');
        await expect(setup.sidebar.box('Browse Block')).toBeVisible();
        await expect(setup.sidebar.box('Browse Block')).not.toBeChecked();
        await setup.sidebar.box('Browse Block').check();
        await setup.save();

        // The block: "Browse", the line "Categories" and the links "Arts",
        // "Physics", "Science", "Physics" indented one step (OMP2: neither
        // the order nor where it stands is read); "Arts" marked, grayed with
        // a grey bar (Rule 15).
        await cat.goto('arts');
        await expect(block.root()).toBeVisible();
        await expect(block.title()).toHaveText('Browse');
        await expect(block.submenu('Categories')).toHaveCount(1);
        await expect(block.submenuLinks('Categories')).toHaveCount(3);
        expect(await names()).toEqual(['Arts', 'Physics', 'Science']);
        const x = Object.fromEntries((await block.flatEntries()).map((e) => [e.name, e.x]));
        expect(x.Science).toBe(x.Arts);
        expect(x.Physics).toBeGreaterThan(x.Science);
        expect(await block.markedNames()).toEqual(['Arts']);
        const marked = await block.look('Arts');
        const plain = await block.look('Science');
        expect(marked.color).not.toBe(plain.color);
        expect(parseFloat(marked.barWidth)).toBeGreaterThan(0);
        expect(marked.barStyle).toBe('solid');
        const [r, g, b] = (marked.barColor.match(/\d+/g) || []).map(Number);
        expect(r === g && g === b, `the bar is grey (${marked.barColor})`).toBe(true);
        expect(plain.barStyle).toBe('none');

        // Another category's link: "Science" opens its page, marked alone
        // (Rule 15).
        await block.link('Science').click();
        await expect(cat.heading()).toHaveText('Science');
        await expect(visitor).toHaveURL(/\/category\/science$/);
        expect(await block.markedNames()).toEqual(['Science']);

        // "Categories" unticked: the window's "Browse Possibilities" with its
        // three boxes ticked; "Categories" unticked and saved; the reloaded
        // block keeps "Browse" and "New Releases" (the positive control) but
        // has no line "Categories" and no category link (Settings bullet 8;
        // Rule 15).
        const plugins = new PluginsTab(page, tag);
        await plugins.goto();
        const blockSettings = await new BrowseBlockSettings(page).open(plugins);
        await expect(blockSettings.group()).toBeVisible();
        expect(await blockSettings.boxes()).toEqual([
            {name: 'New releases', checked: true},
            {name: 'Categories', checked: true},
            {name: 'Series', checked: true},
        ]);
        await blockSettings.box('Categories').uncheck();
        expect(await blockSettings.save()).toBe(200);
        await cat.reload();
        await expect(cat.heading()).toHaveText('Science');
        await expect(block.title()).toHaveText('Browse');
        await expect(block.link('New Releases')).toBeVisible();
        await expect(block.submenu('Categories')).toHaveCount(0);
        await expect(block.root()).not.toContainText('Categories');
        for (const name of ['Arts', 'Physics', 'Science']) {
            await expect(block.link(name)).toHaveCount(0);
        }

        // Control: "Arts"'s own page still opens, headed "Arts": only the
        // block lost its list (Settings bullet 8).
        await cat.goto('arts');
        await expect(cat.heading()).toHaveText('Arts');
        await expect(block.link('New Releases')).toBeVisible();
    });
});
