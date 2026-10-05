// @ts-check
/**
 * @file playwright/tests/U17-sections.spec.js
 *
 * Sections — OPS suite: one test per canonical scenario a preprint server
 * runs: S1 (create and edit a section), S2 (order the sections), S3
 * (deactivate and reactivate), S4 (delete), S5 (the "Submissions" page's
 * section policies) and S6 {OPS} (the "Archives" page and a section's
 * page). Scenario 7 is {OMP} and costs the server no test. The server's
 * vocabulary throughout: Settings › Server › "Sections", Preprint Server
 * Manager, Moderator (`sectionEditor`), "Preprint entry" for the article's
 * "Publication Settings", "Items can only be submitted by Managers and
 * Moderators.", "…to this server.", the section's "Section URL Path. Use
 * hyphens (-) instead of spaces." and its page `preprints/section/{path}`.
 * Spec: docs/specs/U17-sections.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: S5 reads that each section's name under a policy is a link,
 *   never where the link lands.
 * - A6 🐞: no scenario types a title of spaces only.
 * - A7 🐞, A8 🐞: S5 never reads an editorial role's line under an
 *   inactive section's policy, nor "Disable Submissions".
 * - OPS1 🐞, OPS5 🐞: S6 never opens an empty "Archives" page or one past
 *   the last.
 * - OPS2 🐞: S1 never reads the help under "Identify items posted in this
 *   section as a(n)".
 * - A9 🐞, A10 🐞: the journal's programming interface, absent here (A5).
 * - A2 ❓, A3 ❓, A4 ❓, A5 ❓, OPS3 ❓, OPS4 ❓: parked; S6 types a path of
 *   letters only and opens a section's page by its address alone.
 *
 * Seeding: scenario endpoints only (footnote s). Every scenario runs on its
 * own scratch preprint server (`u17s<n>opw…`) with a throwaway Preprint
 * Server Manager "Mona Manager" (`…mg`, the username twice as password);
 * sections come from the context scenario's `sections[]` (the first entry
 * renaming the default "Preprints"; S1 keeps the default untouched), the
 * Moderator "Sam Section" (`…se`) from `users[]` (S4 with `sections:
 * ['ESS']`), S6's categories from `categories[]`, preprints from `POST
 * scenarios/submission` by a throwaway Author (`…au`; S6's three `published`
 * with their own `datePublished`). "Inactive", the editor-only box and
 * "Section archive Description" have no key and are set on screen, as the
 * scenarios say. The signed-out visitor is a second browser context with an
 * empty storage state (patterns.md, parallel lesson 8); every other actor
 * gets its own `asUser` context. Every absence is a settled read paired
 * with a positive control taken the same way.
 *
 * Page objects: shared/playwright/pages/SectionsPages.js (the "Sections"
 * tab and its "Order" mode, the section window, the "Confirm" and "Delete"
 * windows, the notices, About › "Submissions", "Archives" and a section's
 * page); the OPS publication pages from this tree; the start form's
 * "Section" choice and the "Preprint entry" save are local helpers. The parallel `ops` project runs
 * everything: the "Archives" and section pages list posted preprints
 * without the background jobs (only search and category pages wait on them).
 */
const {test: base, expect} = require('../support/fixtures.js');
const {openWorkflow, PublicationScreen} = require('../pages/PublicationPages.js');
const {pastCloseWindow} = require('../../../../shared/playwright/pages/IdentifiersPages.js');
const {
    SectionsTab,
    SubmissionsPage,
    ArchivePage,
    SectionPage,
    notices,
    markNotices,
    expectNotice,
    whole,
} = require('../../../../shared/playwright/pages/SectionsPages.js');

const T = 30_000;

/** The server's strings (OPS and lib/pkp locales). */
const TEXT = {
    saved: 'Your changes have been saved.',
    required: 'This field is required.',
    abbrevSpaces: 'An abbreviated title is required for the section (English)',
    deactivate: 'Are you sure you wish to deactivate this section?',
    activate: 'Are you sure you wish to activate this section?',
    deleteQuestion: 'Are you sure you want to permanently delete this section?',
    lastActive: 'At least one section must be active. Visit the workflow settings to disable all submissions to this server.',
    hasPreprints: 'Before this section can be deleted, you must move preprints posted within it into other section.',
    inactiveBox: 'Mark this section as inactive and do not allow new submissions to be made to it.',
    abstractsBox: 'Do not require abstracts',
    indexingBox: 'Will not be included in the indexing of the server',
    restrictBox: 'Items can only be submitted by Managers and Moderators.',
    assignSentence: 'Select the editorial users who should be assigned automatically to all new submissions to this section.',
    notAccepting: 'This server is not accepting submissions at this time.',
    invite: 'Make a new submission or view your pending submissions.',
    submitLine: (section) => `Make a new submission to the ${section} section.`,
    emptySection: 'Nothing has been posted in this section yet.',
};

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
    return `u17${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6)}`;
}

/** A section entry of the context scenario, its policy optional. */
function section(abbrev, title, path, policy) {
    return {abbrev, title, path, ...(policy ? {policy} : {})};
}

/**
 * A scratch preprint server with a throwaway Preprint Server Manager "Mona
 * Manager" (and any further users and keys).
 */
async function seedServer(opsApi, tag, extra = {}) {
    const {users = [], ...rest} = extra;
    await opsApi.createContext({
        tag,
        context: {name: `U17 server ${tag}`},
        users: [{username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', email: `${tag}mg@mail.test`, roles: ['manager']}, ...users],
        ...rest,
    });
    return `${tag}mg`;
}

/** The throwaway Author "Ada Author". */
const author = (tag) => ({username: `${tag}au`, givenName: 'Ada', familyName: 'Author', email: `${tag}au@mail.test`, roles: ['author']});
/** The throwaway Moderator "Sam Section". */
const moderator = (tag, extra = {}) => ({username: `${tag}se`, givenName: 'Sam', familyName: 'Section', email: `${tag}se@mail.test`, roles: ['sectionEditor'], ...extra});

/** A page of an actor's own signed-in browser context. */
async function actorPage(asUser, username) {
    return (await asUser(username)).newPage();
}

/**
 * Run `action` and wait for the notice carrying `text`, then read that it
 * stands at the top right of the viewport.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 * @param {() => Promise<any>} action
 */
async function topRightNotice(page, text, action) {
    const result = await expectNotice(page, text, action);
    const box = await notices(page, text, {fresh: true}).first().boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport && box.x + box.width > viewport.width / 2 && box.y < viewport.height / 3, `"${text}" sits at the top right`).toBe(true);
    return result;
}

/**
 * Answer a "Confirm" / "Delete" window "OK" (bounded by the grid's answer),
 * then wait out the closed window's slot, so the next opener works
 * (patterns.md pitfall 4).
 *
 * @param {SectionsTab} tab
 * @param {import('../../../../shared/playwright/pages/SectionsPages.js').ConfirmWindow} win
 */
async function answerOk(tab, win) {
    const response = await tab.confirm(win);
    await pastCloseWindow(tab.page);
    return response;
}

/** The start form's "Section" choices, in form order. */
function startFormSections(page) {
    return page.locator('label.pkpFormField--options__option:has(input[name="sectionId"])');
}

/** Open "Make a Submission" by its address. */
async function openStartForm(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/submission`);
    await expect(page.getByRole('heading', {name: /Make a Submission/}).first()).toBeVisible({timeout: T});
}

/** Open a preprint's workflow and its "Preprint entry" page; returns its "Section" list. */
async function openEntry(page, contextPath, submissionId) {
    await openWorkflow(page, contextPath, submissionId);
    await new PublicationScreen(page).openPage('Preprint entry');
    const list = page.locator('select[name="sectionId"]');
    await expect(list).toBeVisible({timeout: T});
    return list;
}

/** Press the "Preprint entry" form's "Save": bounded by the publication's save; returns its response. */
async function saveEntry(page) {
    const form = page.locator('form').filter({has: page.locator('select[name="sectionId"]')});
    const sent = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    return sent;
}

test.describe('sections', () => {
    test('S1: create and edit a section', async ({asUser, opsApi, visitor}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s1', testInfo);
        const manager = await seedServer(opsApi, tag, {users: [moderator(tag)]});
        const page = await actorPage(asUser, manager);
        const tab = new SectionsTab(page, tag);
        const reader = new SubmissionsPage(visitor, tag);

        // The tab with one section (Fields, the "Sections" tab; Rule 1).
        await tab.goto();
        await expect(tab.heading()).toBeVisible();
        await expect(tab.columnHeaders()).toHaveText([whole('Title'), whole('Editors'), whole('Inactive')]);
        await expect(tab.addLink()).toBeVisible();
        const gridBox = await tab.grid().boundingBox();
        const addBox = await tab.addLink().boundingBox();
        expect(gridBox && addBox && addBox.x > gridBox.x + gridBox.width / 2 && addBox.y < gridBox.y + 60, '"Create Section" at the top right').toBe(true);
        await expect(tab.orderLink()).toBeHidden();
        await expect(tab.titleCells()).toHaveText([whole('Preprints')]);
        await expect(tab.editorsCell('Preprints')).toHaveText(whole('None'));
        await expect(tab.inactiveBox('Preprints')).not.toBeChecked();

        // A save with nothing typed: refused under the boxes, nothing sent
        // (Fields, the section window).
        let win = await tab.openAdd();
        await expect(win.heading()).toHaveText(whole('Create Section'));
        await expect(win.saveButton()).toBeVisible();
        await expect(win.cancelLink()).toBeVisible();
        await expect(win.box('wordCount')).toHaveValue('');
        await expect(win.optionBoxes()).toHaveCount(4);
        for (const label of [TEXT.inactiveBox, TEXT.abstractsBox, TEXT.indexingBox, TEXT.restrictBox]) {
            await expect(win.checkbox(label)).not.toBeChecked();
        }
        expect(await win.saveRefusedInPlace(win.fieldError('path')), 'the refused save sends nothing').toBe(0);
        await expect(win.fieldError('title[en]')).toHaveText(TEXT.required);
        await expect(win.fieldError('abbrev[en]')).toHaveText(TEXT.required);
        await expect(win.fieldError('path')).toHaveText(TEXT.required);
        await expect(win.root()).toBeVisible();

        // An abbreviation of spaces: a notice at the top right, nothing
        // marked under the box, the window open (Fields, "Abbreviation").
        await win.type('title[en]', 'Reviews');
        await win.type('abbrev[en]', ' ');
        await win.type('path', 'reviews');
        const refused = await topRightNotice(page, TEXT.abbrevSpaces, () => win.save());
        expect(refused.status()).toBe(200);
        await expect(win.visibleErrors()).toHaveCount(0);
        await expect(win.root()).toBeVisible();

        // The "Editorial Assignments" boxes: the Moderator and one box per
        // Preprint Server Manager (Mona Manager, and `admin`, whom every
        // scratch server enrols as manager, parallel lesson 12; its display
        // name is the install's, seed-facts "admin admin").
        await expect(win.form()).toContainText('Editorial Assignments');
        await expect(win.form()).toContainText(TEXT.assignSentence);
        await expect(win.checkbox('Assign Sam Section as Moderator')).toBeVisible();
        await expect(win.checkbox('Assign Mona Manager as Preprint Server manager')).toBeVisible();
        await expect(win.form().getByRole('checkbox', {name: /^Assign .+ as Preprint Server manager$/})).toHaveCount(2);
        await expect(win.assignmentBoxes()).toHaveCount(3);

        // The new section, last and with no editor (Rule 2; Side effects).
        await win.type('abbrev[en]', 'REV');
        await win.typeRichText('policy[en]', 'Reviews of recent books.');
        await topRightNotice(page, TEXT.saved, () => win.saveAndClose());
        await expect(tab.titleCells()).toHaveText([whole('Preprints'), whole('Reviews')], {timeout: T});
        await expect(tab.editorsCell('Reviews')).toHaveText(whole('None'));
        await expect(tab.inactiveBox('Reviews')).not.toBeChecked();
        await expect(tab.orderLink()).toBeVisible();

        // The visitor's "Submissions" page (Rules 1, 12; Settings bullet 3).
        await reader.goto();
        await expect(reader.blockHeadings().last()).toHaveText(whole('Reviews'));
        await expect(reader.blocks().last()).toContainText('Reviews of recent books.');

        // Edit: the saved values, a new title and the Moderator ticked
        // (Rules 3, 8).
        await pastCloseWindow(page);
        win = await tab.openEdit('Reviews');
        await expect(win.heading()).toHaveText(whole('Edit'));
        await expect(win.box('title[en]')).toHaveValue('Reviews');
        await expect(win.box('abbrev[en]')).toHaveValue('REV');
        await expect(await win.richTextBody('policy[en]')).toHaveText(whole('Reviews of recent books.'));
        await win.type('title[en]', 'Book Reviews');
        await win.checkbox('Assign Sam Section as Moderator').check();
        await win.saveAndClose();
        await expect(tab.row('Book Reviews')).toBeVisible({timeout: T});
        await expect(tab.editorsCell('Book Reviews')).toHaveText(whole('Sam Section'));

        // The new name on the reader's page (Rule 3).
        await reader.goto();
        await expect(reader.block('Book Reviews')).toBeVisible();
        await expect(reader.block('Reviews')).toHaveCount(0);

        // Control: "Preprints", whose boxes were never ticked, still reads
        // "None" (Rule 8).
        await expect(tab.editorsCell('Preprints')).toHaveText(whole('None'));
    });

    test('S2: order the sections', async ({asUser, opsApi, visitor}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const manager = await seedServer(opsApi, tag, {
            sections: [
                section('ART', 'Articles', 'articles', 'Policy for articles.'),
                section('REV', 'Reviews', 'reviews', 'Policy for reviews.'),
                section('ESS', 'Essays', 'essays', 'Policy for essays.'),
            ],
            users: [author(tag)],
        });
        const page = await actorPage(asUser, manager);
        const authorPage = await actorPage(asUser, `${tag}au`);
        const tab = new SectionsTab(page, tag);
        const seeded = [whole('Articles'), whole('Reviews'), whole('Essays')];
        const ordered = [whole('Essays'), whole('Articles'), whole('Reviews')];

        // "Order": drag handles, "Done" and "Cancel ordering" (Rule 4a).
        await tab.goto();
        await expect(tab.titleCells()).toHaveText(seeded);
        await expect(tab.row('Articles')).not.toHaveClass(/\bordering\b/);
        await expect(tab.doneLink()).toBeHidden();
        await tab.startOrdering();
        for (const title of ['Articles', 'Reviews', 'Essays']) {
            await expect(tab.row(title)).toHaveClass(/\bordering\b/);
        }
        await expect(tab.cancelOrderingLink()).toBeVisible();

        // "Cancel ordering" puts the rows back (Rule 4a).
        await tab.drag('Essays', 'Articles');
        await expect(tab.titleCells()).toHaveText(ordered);
        await tab.cancelOrdering();
        await expect(tab.titleCells()).toHaveText(seeded);

        // Control: right after "Cancel ordering", the Author's "Section"
        // choice keeps the seeded order (Rules 4a, 4c).
        await openStartForm(authorPage, tag);
        await expect(startFormSections(authorPage)).toHaveText(seeded, {timeout: T});

        // "Done" keeps the order, with no notice; a reload keeps it too
        // (Rule 4a; Side effects).
        await markNotices(page);
        await tab.startOrdering();
        await tab.drag('Essays', 'Articles');
        await expect(tab.titleCells()).toHaveText(ordered);
        expect((await tab.done()).status()).toBe(200);
        await expect(tab.titleCells()).toHaveText(ordered);
        await expect(notices(page, undefined, {fresh: true})).toHaveCount(0);
        await tab.reload();
        await expect(tab.titleCells()).toHaveText(ordered);

        // The start form follows the order (Rule 4c).
        await openStartForm(authorPage, tag);
        await expect(startFormSections(authorPage)).toHaveText(ordered, {timeout: T});

        // The "Submissions" page follows it (Rules 4c, 12).
        const reader = new SubmissionsPage(visitor, tag);
        await reader.goto();
        await expect(reader.blockHeadings()).toHaveText(ordered);

        // A new section after an order goes last (Rule 2); its save's notice,
        // read the same way, is the positive control for "Done"'s none.
        const win = await tab.openAdd();
        await win.type('title[en]', 'Letters');
        await win.type('abbrev[en]', 'LET');
        await win.type('path', 'letters');
        await expectNotice(page, TEXT.saved, () => win.saveAndClose());
        await expect(notices(page, undefined, {fresh: true})).toHaveCount(1);
        await expect(tab.titleCells()).toHaveText([...ordered, whole('Letters')], {timeout: T});
    });

    test('S3: deactivate and reactivate a section', async ({asUser, opsApi, visitor}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s3', testInfo);
        const manager = await seedServer(opsApi, tag, {
            sections: [section('ART', 'Articles', 'articles', 'Policy for articles.'), section('REV', 'Reviews', 'reviews', 'Policy for reviews.')],
            users: [author(tag)],
        });
        const item = await opsApi.createSubmission({tag, context: tag, submitter: `${tag}au`, title: 'Tidal Patterns', section: 'REV', submitted: true});
        const page = await actorPage(asUser, manager);
        const tab = new SectionsTab(page, tag);
        const reader = new SubmissionsPage(visitor, tag);

        // Before: both blocks on the visitor's page (the positive control
        // for the absence below).
        await reader.goto();
        await expect(reader.blockHeadings()).toHaveText([whole('Articles'), whole('Reviews')]);

        // Deactivate from the table (Rule 5; Side effects).
        await tab.goto();
        let confirm = await tab.pressInactive('Reviews');
        await expect(confirm.root().getByRole('heading', {name: 'Confirm'})).toBeVisible();
        await expect(confirm.question()).toHaveText(whole(TEXT.deactivate));
        await expect(confirm.button('OK')).toBeVisible();
        await expect(confirm.button('Cancel')).toBeVisible();
        await topRightNotice(page, TEXT.saved, () => answerOk(tab, confirm));
        await expect(tab.inactiveBox('Reviews')).toBeChecked({timeout: T});

        // The visitor's page: "Articles", no "Reviews" (Rules 5d, 12a).
        await reader.goto();
        await expect(reader.block('Articles')).toBeVisible();
        await expect(reader.block('Reviews')).toHaveCount(0);
        await expect(reader.blockHeadings()).toHaveText([whole('Articles')]);

        // "Preprint entry": "Reviews (Inactive)" (Rule 5b).
        const list = await openEntry(page, tag, item.submissionId);
        await expect(list.locator('option')).toHaveText([whole('Articles'), whole('Reviews (Inactive)')]);

        // The last active section, from the table (Rule 6a).
        await tab.goto();
        confirm = await tab.pressInactive('Articles');
        await expect(confirm.question()).toHaveText(whole(TEXT.deactivate));
        await topRightNotice(page, TEXT.lastActive, () => answerOk(tab, confirm));
        await expect(tab.inactiveBox('Articles')).not.toBeChecked();

        // The last active section, from its window (Rule 6b; Fields, the
        // section window).
        await tab.goto();
        let win = await tab.openEdit('Articles');
        await win.checkbox(TEXT.inactiveBox).check();
        await topRightNotice(page, TEXT.lastActive, () => win.save());
        await expect(win.root()).toBeVisible();
        await expect(win.checkbox(TEXT.inactiveBox)).toBeChecked();
        await win.cancel();
        await expect(tab.inactiveBox('Articles')).not.toBeChecked();
        await tab.reload();
        await expect(tab.inactiveBox('Articles')).not.toBeChecked();

        // Reactivate (Rules 5, 12a; Side effects).
        confirm = await tab.pressInactive('Reviews');
        await expect(confirm.question()).toHaveText(whole(TEXT.activate));
        await topRightNotice(page, TEXT.saved, () => answerOk(tab, confirm));
        await expect(tab.inactiveBox('Reviews')).not.toBeChecked({timeout: T});
        await reader.goto();
        await expect(reader.blockHeadings()).toHaveText([whole('Articles'), whole('Reviews')]);

        // Deactivate from the window (Rule 5; Settings bullet 1).
        win = await tab.openEdit('Reviews');
        await win.checkbox(TEXT.inactiveBox).check();
        await topRightNotice(page, TEXT.saved, () => win.saveAndClose());
        await expect(tab.inactiveBox('Reviews')).toBeChecked({timeout: T});

        // Control: "Articles" stayed active throughout, and its block never
        // left the visitor's page (Rule 6).
        await expect(tab.inactiveBox('Articles')).not.toBeChecked();
        await reader.goto();
        await expect(reader.blockHeadings()).toHaveText([whole('Articles')]);
    });

    test('S4: delete a section', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const manager = await seedServer(opsApi, tag, {
            sections: [section('ART', 'Articles', 'articles'), section('REV', 'Reviews', 'reviews'), section('ESS', 'Essays', 'essays')],
            users: [author(tag), moderator(tag, {sections: ['ESS']})],
        });
        const item = await opsApi.createSubmission({tag, context: tag, submitter: `${tag}au`, title: 'Tidal Patterns', section: 'REV', submitted: true});
        const page = await actorPage(asUser, manager);
        const tab = new SectionsTab(page, tag);

        // The delete window (Rule 7).
        await tab.goto();
        let confirm = await tab.openDelete('Reviews');
        await expect(confirm.root().getByRole('heading', {name: 'Delete'})).toBeVisible();
        await expect(confirm.question()).toHaveText(whole(TEXT.deleteQuestion));
        await expect(confirm.button('OK')).toBeVisible();
        await expect(confirm.button('Cancel')).toBeVisible();

        // A section holding a preprint: the row stays (Rule 7a).
        await topRightNotice(page, TEXT.hasPreprints, () => answerOk(tab, confirm));
        await expect(tab.row('Reviews')).toBeVisible();

        // Moving the preprint out: the server's first "Save" saves (Rule 7c).
        const list = await openEntry(page, tag, item.submissionId);
        await list.selectOption({label: 'Articles'});
        const moved = await saveEntry(page);
        expect(moved.ok(), 'the "Preprint entry" save is accepted').toBe(true);
        await expect(page.getByRole('status').filter({hasText: 'Saved'}).first()).toBeVisible({timeout: T});
        await expect(page.locator('.pkpFieldError').filter({visible: true})).toHaveCount(0);
        await openEntry(page, tag, item.submissionId);
        await expect(page.locator('select[name="sectionId"] option:checked')).toHaveText(whole('Articles'));

        // The emptied section goes, with no notice (Rule 7; Side effects);
        // the refusal's notice above, read the same way, is the control.
        await tab.goto();
        await markNotices(page);
        confirm = await tab.openDelete('Reviews');
        await answerOk(tab, confirm);
        await expect(tab.row('Reviews')).toHaveCount(0, {timeout: T});
        await expect(tab.titleCells()).toHaveText([whole('Articles'), whole('Essays')]);
        await expect(notices(page, undefined, {fresh: true})).toHaveCount(0);

        // Its editors go with it (Rule 2; Side effects).
        await expect(tab.editorsCell('Essays')).toHaveText(whole('Sam Section'));
        confirm = await tab.openDelete('Essays');
        await answerOk(tab, confirm);
        await expect(tab.row('Essays')).toHaveCount(0, {timeout: T});
        await expect(tab.titleCells()).toHaveText([whole('Articles')]);
        const win = await tab.openAdd();
        await win.type('title[en]', 'Essays');
        await win.type('abbrev[en]', 'ESS');
        await win.type('path', 'essays');
        await win.saveAndClose();
        await expect(tab.titleCells()).toHaveText([whole('Articles'), whole('Essays')], {timeout: T});
        await expect(tab.editorsCell('Essays')).toHaveText(whole('None'));

        // The last active section cannot be deleted (Rules 6c, 7b).
        await pastCloseWindow(page);
        confirm = await tab.pressInactive('Articles');
        await answerOk(tab, confirm);
        await expect(tab.inactiveBox('Articles')).toBeChecked({timeout: T});
        confirm = await tab.openDelete('Essays');
        await topRightNotice(page, TEXT.lastActive, () => answerOk(tab, confirm));
        await expect(tab.row('Essays')).toBeVisible();

        // Control: after a reload, "Articles" (ticked) and "Essays", and no
        // "Reviews" (Rules 1, 7).
        await tab.reload();
        await expect(tab.titleCells()).toHaveText([whole('Articles'), whole('Essays')]);
        await expect(tab.inactiveBox('Articles')).toBeChecked();
        await expect(tab.inactiveBox('Essays')).not.toBeChecked();
        await expect(tab.row('Reviews')).toHaveCount(0);
    });

    test('S5: the "Submissions" page\'s section policies', async ({asUser, opsApi, visitor}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const manager = await seedServer(opsApi, tag, {
            sections: [
                section('ART', 'Articles', 'articles', 'Policy for articles.'),
                section('REV', 'Reviews', 'reviews', 'Policy for reviews.'),
                section('NOTE', 'Notes', 'notes'),
            ],
            users: [author(tag)],
        });
        const page = await actorPage(asUser, manager);
        const tab = new SectionsTab(page, tag);
        const visitorPage = new SubmissionsPage(visitor, tag);
        const authorPage = new SubmissionsPage(await actorPage(asUser, `${tag}au`), tag);
        const managerPage = new SubmissionsPage(page, tag);
        const both = [whole('Articles'), whole('Reviews')];

        // The visitor: two blocks after the checklist, none for "Notes", no
        // submission line (Rules 12, 12b; Settings bullet 3).
        await visitorPage.goto();
        await expect(visitorPage.blockHeadings()).toHaveText(both);
        await expect(visitorPage.checklist()).toBeVisible();
        await expect(visitorPage.blocksAfterChecklist()).toHaveCount(2);
        expect(await visitorPage.policyText('Articles')).toBe('Policy for articles.');
        expect(await visitorPage.policyText('Reviews')).toBe('Policy for reviews.');
        await expect(visitorPage.block('Notes')).toHaveCount(0);
        await expect(visitorPage.submitLines()).toHaveCount(0);
        // Control (Rule 13): before "Notes" is restricted, no notice that
        // nothing is accepted; the visitor is invited to sign in.
        await expect(visitorPage.notice()).not.toContainText(TEXT.notAccepting);
        await expect(visitorPage.notice()).toContainText('to make a submission');

        // The signed-in Author: the same blocks, each with its line and link
        // (Rule 12b); the positive control for the visitor's no line.
        await authorPage.goto();
        await expect(authorPage.blockHeadings()).toHaveText(both);
        await expect(authorPage.submitLine('Articles')).toHaveText(whole(TEXT.submitLine('Articles')));
        await expect(authorPage.submitLine('Reviews')).toHaveText(whole(TEXT.submitLine('Reviews')));
        await expect(authorPage.submitLink('Articles')).toBeVisible();
        await expect(authorPage.submitLink('Reviews')).toBeVisible();
        await expect(authorPage.notice()).not.toContainText(TEXT.notAccepting);
        await expect(authorPage.notice()).toContainText(TEXT.invite);

        // Restricted and inactive (Rule 5; Settings bullets 1, 2).
        await tab.goto();
        let win = await tab.openEdit('Reviews');
        await win.checkbox(TEXT.restrictBox).check();
        await expectNotice(page, TEXT.saved, () => win.saveAndClose());
        await pastCloseWindow(page);
        const confirm = await tab.pressInactive('Articles');
        await answerOk(tab, confirm);
        await expect(tab.inactiveBox('Articles')).toBeChecked({timeout: T});

        // The Author's and the visitor's page: no block (Rules 5d, 12a;
        // Settings bullet 2).
        await authorPage.goto();
        await expect(authorPage.blocks()).toHaveCount(0);
        await expect(authorPage.notice()).toContainText(TEXT.invite);
        await visitorPage.goto();
        await expect(visitorPage.blocks()).toHaveCount(0);

        // The manager's page: both blocks (Rule 12a), the positive control
        // for the two empty reads above.
        await managerPage.goto();
        await expect(managerPage.blockHeadings()).toHaveText(both);

        // No section open (Rules 13, 13a).
        await tab.goto();
        win = await tab.openEdit('Notes');
        await win.checkbox(TEXT.restrictBox).check();
        await expectNotice(page, TEXT.saved, () => win.saveAndClose());
        await authorPage.goto();
        await expect(authorPage.notice()).toHaveText(whole(TEXT.notAccepting));
        await visitorPage.goto();
        await expect(visitorPage.notice()).toHaveText(whole(TEXT.notAccepting));
        await managerPage.goto();
        await expect(managerPage.notice()).toHaveText(whole(TEXT.invite));
        await expect(managerPage.blockHeadings()).toHaveText(both);
    });

    test('S6: a preprint server\'s "Archives" and section pages', async ({asUser, opsApi, visitor}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const manager = await seedServer(opsApi, tag, {
            sections: [section('PRE', 'Preprints', 'preprints'), section('REV', 'Reviews', 'reviews')],
            categories: [
                {path: 'applied-science', title: 'Applied Science', children: [{path: 'computer-science', title: 'Computer Science'}]},
                {path: 'social-sciences', title: 'Social Sciences'},
            ],
            users: [author(tag)],
        });
        for (const [title, day] of [['Alpha Study', '2024-03-01'], ['Beta Study', '2024-03-02'], ['Gamma Study', '2024-03-03']]) {
            await opsApi.createSubmission({
                tag: `${tag}${title[0].toLowerCase()}`,
                context: tag,
                submitter: `${tag}au`,
                title,
                section: 'PRE',
                submitted: true,
                published: true,
                datePublished: day,
            });
        }
        const page = await actorPage(asUser, manager);
        const tab = new SectionsTab(page, tag);
        const archive = new ArchivePage(visitor, tag);
        const sectionPage = new SectionPage(visitor, tag);
        const newestFirst = [/Gamma Study/, /Beta Study/, /Alpha Study/];

        /** The archive header's search box and its two top-level category links, no sub-category. */
        const expectArchiveHeader = async () => {
            await expect(archive.searchBox()).toBeVisible({timeout: T});
            await expect(archive.categoryLinks()).toHaveCount(2);
            await expect(archive.categoryLinks().filter({hasText: whole('Applied Science')})).toBeVisible();
            await expect(archive.categoryLinks().filter({hasText: whole('Social Sciences')})).toBeVisible();
            await expect(archive.categoryLinks().filter({hasText: 'Computer Science'})).toHaveCount(0);
        };

        // Control first: before the path changes, "critiques" is no
        // section's page (Rule 16c).
        await sectionPage.expect404('critiques');

        // "Archives" from the main menu (Rules 14, 14a).
        await archive.gotoHome();
        await archive.menuLink().click();
        await expect(archive.heading()).toHaveText(whole('Archives'), {timeout: T});
        await expectArchiveHeader();
        await expect(archive.itemTitles()).toHaveText(newestFirst);

        // The home page: the same header above "Latest preprints" (Rule 15).
        await archive.gotoHome();
        await expectArchiveHeader();
        await expect(archive.latestHeading()).toBeVisible();
        const headerBox = await archive.archiveHeader().boundingBox();
        const latestBox = await archive.latestHeading().boundingBox();
        expect(headerBox && latestBox && headerBox.y + headerBox.height <= latestBox.y + 1, 'the archive header stands above "Latest preprints"').toBe(true);

        // A section's page (Rules 16, 16a).
        let response = await sectionPage.goto('preprints');
        expect(response?.status()).toBe(200);
        await expect(sectionPage.heading()).toHaveText(whole('Preprints'));
        await expect(sectionPage.itemTitles()).toHaveText(newestFirst);

        // An empty section's page, with its description (Rule 16a; Settings
        // bullet 14).
        await tab.goto();
        let win = await tab.openEdit('Reviews');
        await win.typeRichText('description[en]', 'Reviews of recent preprints.');
        await win.saveAndClose();
        response = await sectionPage.goto('reviews');
        expect(response?.status()).toBe(200);
        await expect(sectionPage.heading()).toHaveText(whole('Reviews'));
        await expect(sectionPage.description()).toHaveText(whole('Reviews of recent preprints.'));
        await expect(sectionPage.emptyLine()).toHaveText(whole(TEXT.emptySection));
        await expect(sectionPage.items()).toHaveCount(0);

        // An inactive section's page still opens (Rules 5b, 16).
        await pastCloseWindow(page);
        const confirm = await tab.pressInactive('Reviews');
        await answerOk(tab, confirm);
        await expect(tab.inactiveBox('Reviews')).toBeChecked({timeout: T});
        response = await visitor.reload();
        expect(response?.status()).toBe(200);
        await expect(sectionPage.heading()).toHaveText(whole('Reviews'));

        // A changed path (Rules 3, 16c; Settings bullet 14).
        win = await tab.openEdit('Reviews');
        await expect(win.box('path')).toHaveValue('reviews');
        await win.type('path', 'critiques');
        await win.saveAndClose();
        response = await sectionPage.goto('critiques');
        expect(response?.status()).toBe(200);
        await expect(sectionPage.heading()).toHaveText(whole('Reviews'));
        await sectionPage.expect404('reviews');
    });
});
