// @ts-check
/**
 * @file playwright/tests/U72-chapters-work-type.spec.js
 *
 * U72 — Chapters & work type, OMP suite. One test per canonical scenario
 * the spec runs on a press: scenarios 1–10 (the feature is {OMP}, so every
 * common scenario runs here), plus S11's "Control" bullet on the seeded
 * press (the start screen's "Submission Type", the draft's Details step
 * "Chapters" section, and the submitted book's "Chapters" page, work-type
 * button and "Marketing" group). S11's own absence bullets are {OJS OPS}
 * and run in those suites.
 * Spec: docs/specs/U72-chapters-work-type.md
 *
 * Deliberately NOT covered, by register ID (the spec's Coverage section is
 * the record of everything else left out; a 🐞 is never asserted as the
 * contract, a ❓ is not a gap):
 * - A1 ❓: no assistant role opens a published version's list here.
 * - A2 🐞: no assistant role presses the work-type control or "Save" on
 *   "Publication Dates".
 * - A3 🐞: S10 reads nothing of the copied chapter's "Files".
 * - A4 🐞: S6 reads "Date Published" only after a date is typed.
 * - A5 🐞: S3 never presses the Review panel's "Edit".
 * - A6 🐞: no test drags a chapter; S2 reads that the chapters keep their
 *   order across an author drag.
 * - A7 🐞: S2's drag never leaves an author n-th in the chapter while
 *   (n + 1)-th on Contributors (Rule 8b), and it reloads the page between
 *   one "Done" and the next ordering.
 * - A8 🐞: S8 reads "Harbours"' own address, not the sentence above it.
 * - A9 ❓: no chapter is added to a published Edited Volume.
 *
 * Seeding: scenario endpoints only; the seeded press and roster are
 * read-only (PRINCIPLES A1, A7). S2, S4–S6, S10 and S11 seed scratch books
 * on `publicknowledge` with the roster (footnote s). S1, S3 and S7 read the
 * chapter window's "Your changes have been saved.": that notice is queued
 * per user on the server and drained by any page load of that user, so a
 * roster account's notice can be taken by a parallel test (patterns.md,
 * parallel lesson 2); those three scenarios run on a scratch press with a
 * throwaway Press manager and a throwaway Author ("Ava Author"), the
 * given's roles unchanged. S8 and S9 build the scratch presses their
 * givens name. The contributors Ada Lovel and Ben Barrow (and S3's Zed
 * Zephyr) carry addresses unique to the test (A8), so S1's mailbox reads
 * are scoped by them; the silence is bounded by a discussion email the
 * test itself sends. S8's version licenses have no scenario key (the
 * context scenario refuses `licenseUrl`, seed-facts.md), so the test types
 * them on each version's "Permissions & Disclosure" page before the
 * scenario's first step, as the footnote says. Tags are unique per run
 * (M5); waits are web-first (A5). Everything runs in the parallel `omp`
 * project.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    WORK_TYPES,
    PUBLICATION_DATES,
    TEXT,
    exactly,
    chaptersMenuKey,
    ChaptersPage,
} = require('../pages/ChapterPages.js');
const {ContributorsScreen} = require('../pages/ContributorPages.js');
const {saveLicenseFields} = require('../pages/PublicationPages.js');
const {publishFromWorkflow} = require('../pages/CatalogPages.js');
const wizard = require('../pages/SubmissionWizardPages.js');
const {expectNotice} = require('../../../../shared/playwright/pages/SectionsPages.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');

const PRESS = 'publicknowledge';
const MANAGER = 'manager.maya';
const AUTHOR = 'author.alex';
const SERIES_EDITOR = 'sectioneditor.ana';
const COPYEDITOR = 'copyeditor.carla';
const LAYOUT_EDITOR = 'layouteditor.leo';
const NO_ACCESS = "You don't currently have access to that stage of the workflow.";

const OWN_LICENSE = 'https://example.org/own-license';
const VERSION_LICENSE = 'https://example.org/version-license';
const CHAPTER_DEFAULT = 'https://example.org/chapter-default';

/** Unique per-run tag: one alphanumeric token, scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u72${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** The given's two contributors, with addresses unique to the test (A8). */
function people(tag) {
    return {
        ada: {givenName: 'Ada', familyName: 'Lovel', email: `ada${tag}@mail.test`},
        ben: {givenName: 'Ben', familyName: 'Barrow', email: `ben${tag}@mail.test`},
    };
}

/**
 * A scratch press with a throwaway Press manager ("Mona Manager") and a
 * throwaway Author ("Ava Author"); `keys` are extra context keys.
 */
async function scratchPress(ompApi, tag, keys = {}) {
    const mg = {username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', email: `${tag}mg@mail.test`, roles: ['manager']};
    const au = {username: `${tag}au`, givenName: 'Ava', familyName: 'Author', email: `${tag}au@mail.test`, roles: ['author']};
    await ompApi.createContext({tag, context: {name: `Press ${tag}`}, users: [mg, au], ...keys});
    return {path: tag, mg, au};
}

/** A scratch book; `context` defaults to the seeded press, `submitter` to its Author. */
async function seedBook(ompApi, tag, {context = PRESS, submitter = AUTHOR, ...rest} = {}) {
    return ompApi.createSubmission({tag, context, submitter, title: `Book ${tag}`, ...rest});
}

/**
 * A page as `username`. Browser dialogs: a page-leave question
 * (`beforeunload`) is accepted; every other one takes the next answer the
 * test queued (`answers`), dismissed when none is queued; `seen` records
 * each one's type and message.
 */
async function pageAs(asUser, username) {
    const page = await (await asUser(username)).newPage();
    const seen = [];
    const answers = [];
    page.on('dialog', (dialog) => {
        seen.push({type: dialog.type(), message: dialog.message()});
        const answer = dialog.type() === 'beforeunload' ? 'accept' : answers.shift() || 'dismiss';
        (answer === 'accept' ? dialog.accept() : dialog.dismiss()).catch(() => {});
    });
    return {page, seen, answers};
}

/**
 * Add a discussion on the open workflow's stage with one participant
 * ticked; the participant gets the "new discussion" email, the mailbox
 * reads' positive control (A8). U11's shape.
 */
async function addDiscussion(page, {name, participantUsername, message}) {
    const panel = page.locator('[data-cy="discussion-manager"]').first();
    await expect(panel.getByRole('heading', {name: /Tasks & Discussions$/})).toBeVisible({timeout: 30_000});
    await panel.getByRole('button', {name: 'Add', exact: true}).click();
    const modal = page.locator('[data-cy="active-modal"]').filter({has: page.locator('input[name="title"]')});
    await modal.locator('input[name="title"]').fill(name);
    const participantBox = modal.getByRole('checkbox', {name: new RegExp(participantUsername)});
    await expect(participantBox).toBeVisible({timeout: 30_000});
    await participantBox.check();
    const body = modal.frameLocator('iframe').first().locator('body');
    await body.click();
    await body.fill(message);
    const saved = page.waitForResponse(
        (r) => r.request().method() === 'POST' && /\/submissions\/\d+\/tasks$/.test(r.url()),
        {timeout: 30_000}
    );
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    const response = await saved;
    expect(response.ok(), `discussion save answered ${response.status()}`).toBe(true);
    await expect(modal).toHaveCount(0, {timeout: 30_000});
}

/** The Activity Log's rows, read once its log has drawn a data row. */
async function activityLogRows(frame) {
    const dialog = await frame.openActivityLog();
    const rows = dialog.getByRole('row');
    await expect.poll(() => rows.count(), {timeout: 30_000}).toBeGreaterThan(1);
    const texts = (await rows.allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
    await frame.closeActivityLog();
    return texts;
}

/** "Create New Version" from the side menu, confirmed untouched; returns the new publication's id. */
async function createNewVersion(page) {
    const frame = new WorkflowPage(page, null);
    const item = await frame.revealPublicationEntry('Create New Version');
    await frame.expectVersionLoaded();
    await item.click();
    const dialog = page.getByRole('dialog', {name: 'Create New Version'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    await expect(dialog.getByLabel('Publication Stage')).toBeVisible({timeout: 30_000});
    const created = page.waitForResponse(
        (r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const body = await (await created).json();
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    return body.id;
}

/** A sorted copy (the "Files" boxes of one request share their upload second: scenarios.md). */
const sorted = (list) => [...list].sort();

test.describe('Chapters & work type (U72)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test('S1: A chapter list built on the Chapters page', async ({asUser, ompApi, appContext, pkpMail}, testInfo) => {
        const tag = makeTag('s1', testInfo);
        const press = await scratchPress(ompApi, tag);
        const {ada, ben} = people(tag);
        // Given: a submitted Monograph with no chapters, the Author's own
        // entry, Ada Lovel and Ben Barrow on its Contributors list, and the
        // files article.pdf and notes.md (footnote s).
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            contributors: [ada, ben],
            files: [{file: 'article.pdf'}, {file: 'notes.md'}],
        });
        const {page, seen, answers} = await pageAs(asUser, press.mg.username);
        const cp = new ChaptersPage(page, press.path, {appContext});
        const {list} = cp;
        await cp.frame.gotoEditorial(book.submissionId);
        const logBefore = await activityLogRows(cp.frame);

        // ── The empty list (Fields, the chapter list) ─────────────────────
        await cp.openFromMenu();
        await expect(list.heading()).toHaveText(exactly('Chapters'));
        await expect(list.emptyListLine()).toHaveText(exactly('No Items'));
        await expect(list.headerLinks()).toHaveText([exactly('Add Chapter')]);
        await expect(list.orderLink()).toHaveCount(0);
        await expect(list.chapterBlocks()).toHaveCount(0);

        // ── "Add Chapter" (Fields, the chapter window) ─────────────────────
        let win = await list.openAdd();
        await expect(win.headingEl()).toHaveText('Add Chapter');
        await expect(win.titleBox()).toBeVisible();
        await expect(win.subtitleBox()).toBeVisible();
        await expect(win.abstractEditor()).toBeVisible();
        await expect(win.pagesBox()).toBeVisible();
        for (const label of ['Subtitle', 'Abstract', 'Pages', 'Chapter Page', 'Add Contributor', 'Files']) {
            await expect(win.form().getByText(label, {exact: true}).first()).toBeVisible();
        }
        await expect(win.chapterPageBox()).not.toBeChecked();
        expect(await win.boxStates('contributors')).toEqual(['[ ] Ava Author', '[ ] Ada Lovel', '[ ] Ben Barrow']);
        expect(sorted(await win.boxStates('files'))).toEqual(['[ ] article.pdf', '[ ] notes.md']);
        await expect(win.requiredNote()).toBeVisible();
        await expect(win.saveButton()).toBeVisible();
        await expect(win.cancelLink()).toBeVisible();

        // ── An empty title (Fields, Title) ────────────────────────────────
        const updates = [];
        page.on('request', (r) => {
            if (/update-chapter/i.test(r.url())) updates.push(r.url());
        });
        await win.saveButton().click();
        await expect(win.titleError()).toHaveText(TEXT.required);
        await expect(win.dialog()).toBeVisible();
        expect(updates, 'the refused title sends no save').toEqual([]);
        await expect(list.emptyListLine()).toHaveText(exactly('No Items'));

        // ── "Tides" (Rules 4, 5a, 6, 7; Fields) ───────────────────────────
        await win.fill({title: 'Tides', subtitle: 'A Study', pages: '1-24'});
        await win.contributorBox('Ben Barrow').check();
        await win.fileBox('article.pdf').check();
        await expectNotice(page, TEXT.saved, () => win.save());
        await expect(list.titleCells()).toHaveText([exactly('Tides')]);
        await expect(list.columnHeads()).toHaveText(['Name', 'Email', 'Role'].map(exactly));
        await list.expectAuthorRows('Tides', [['Ben Barrow', ben.email, 'Author']]);
        // "Add Chapter" standing alone, with no "Order": the redrawn list
        // offers "Order" above its one chapter, T-omp-1; not asserted
        // either way here.
        await expect(list.addChapterLink()).toBeVisible();

        // ── "Harbours", with no author (Rules 4, 7; Fields) ───────────────
        win = await list.openAdd();
        expect(await win.boxStates('files')).toEqual(['[ ] notes.md']);
        await win.fill({title: 'Harbours'});
        await win.save();
        await expect(list.titleCells()).toHaveText([exactly('Tides'), exactly('Harbours')]);
        await expect(await list.noAuthorsLine('Harbours')).toHaveText(exactly('No Items'));
        await expect(list.authorRows('Harbours')).toHaveCount(0);
        await expect(list.headerLinks()).toHaveText([exactly('Order'), exactly('Add Chapter')]);

        // ── "Tides" edited (Rule 6; Fields) ───────────────────────────────
        win = await list.openEdit('Tides');
        await expect(win.headingEl()).toHaveText('Edit Chapter');
        await expect(win.tabs()).toHaveText([exactly('Edit Metadata')]);
        await expect(win.tabs().first()).toHaveAttribute('aria-selected', 'true');
        await expect(win.titleBox()).toHaveValue('Tides');
        await expect(win.subtitleBox()).toHaveValue('A Study');
        await expect(win.pagesBox()).toHaveValue('1-24');
        expect(await win.boxStates('contributors')).toEqual(['[x] Ben Barrow', '[ ] Ava Author', '[ ] Ada Lovel']);
        expect(sorted(await win.boxStates('files'))).toEqual(['[ ] notes.md', '[x] article.pdf']);
        await win.contributorBox('Ada Lovel').check();
        await win.save();
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ben Barrow'), exactly('Ada Lovel')]);

        // ── Leaving the window unsaved (Rule 5b) ──────────────────────────
        win = await list.openEdit('Tides');
        await win.pagesBox().fill('1-30');
        await win.pagesBox().press('Tab');
        const asked = seen.length;
        await win.cancel();
        expect(seen.length, '"Cancel" asks nothing').toBe(asked);
        win = await list.openEdit('Tides');
        await expect(win.pagesBox()).toHaveValue('1-24');
        await win.pagesBox().fill('1-30');
        await win.pagesBox().press('Tab');
        answers.push('dismiss');
        await win.closeArrow().click();
        await expect.poll(() => seen.length).toBe(asked + 1);
        expect(seen[asked]).toEqual({type: 'confirm', message: TEXT.formChanged});
        await expect(win.dialog()).toBeVisible();
        await expect(win.pagesBox()).toHaveValue('1-30');
        answers.push('accept');
        await win.closeArrow().click();
        await win.expectClosed();
        expect(seen[asked + 1]).toEqual({type: 'confirm', message: TEXT.formChanged});
        win = await list.openEdit('Tides');
        await expect(win.pagesBox()).toHaveValue('1-24');
        await win.cancel();

        // ── Leaving the page (Rule 5b) ────────────────────────────────────
        win = await list.openAdd();
        await win.titleBox().fill('Coda');
        await win.titleBox().press('Tab');
        const beforeLeave = seen.length;
        await page.goto(`/index.php/${press.path}`);
        expect(seen.slice(beforeLeave).map((d) => d.type)).toEqual(['beforeunload']);
        await cp.gotoEditorial(book.submissionId, book.publicationId);
        await expect(list.titleCells()).toHaveText([exactly('Tides'), exactly('Harbours')]);

        // ── Control: no email, no Activity Log line (Side effects 1, 2) ───
        await cp.frame.gotoEditorial(book.submissionId);
        expect(await activityLogRows(cp.frame)).toEqual(logBefore);
        const discussion = `Control ${tag}`;
        await addDiscussion(page, {name: discussion, participantUsername: press.au.username, message: `Control message ${tag}.`});
        const control = {to: press.au.email, subject: discussion};
        for (const to of [ada.email, ben.email]) {
            await pkpMail.expectNone({to, afterControl: control});
        }
        for (const contains of ['Tides', 'Harbours']) {
            await pkpMail.expectNone({to: press.au.email, contains, afterControl: control});
        }
    });

    test('S2: Chapter authors ordered, and a contributor and a chapter deleted', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s2', testInfo);
        const {ada, ben} = people(tag);
        // Given: "Tides" (Ada Lovel, then Ben Barrow; article.pdf) and
        // "Harbours" (Ada Lovel); notes.md belongs to no chapter.
        const book = await seedBook(ompApi, tag, {
            contributors: [ada, ben],
            files: [{file: 'article.pdf'}, {file: 'notes.md'}],
            chapters: [
                {title: 'Tides', authors: [ada.email, ben.email], files: ['files.0']},
                {title: 'Harbours', authors: [ada.email]},
            ],
        });
        const {page} = await pageAs(asUser, MANAGER);
        const cp = new ChaptersPage(page, PRESS, {appContext});
        const {list} = cp;
        await cp.gotoEditorial(book.submissionId, book.publicationId);
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ada Lovel'), exactly('Ben Barrow')]);

        // ── "Order" (Rule 8) ──────────────────────────────────────────────
        await expect(list.orderHandles()).toHaveCount(0);
        await list.startOrdering();
        await expect(list.orderHandles()).toHaveCount(5);
        await expect(list.chapterRow('Tides').locator('a.pkp_linkaction_moveItem')).toBeVisible();
        await expect(list.chapterRow('Harbours').locator('a.pkp_linkaction_moveItem')).toBeVisible();
        await expect(list.doneLink()).toHaveText(exactly('Done'));
        await expect(list.cancelOrderingLink()).toHaveText(exactly('Cancel ordering'));

        // ── Authors reordered (Rules 8a, 8b) ──────────────────────────────
        await list.dragAuthorAbove('Tides', 'Ben Barrow', 'Ada Lovel');
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ben Barrow'), exactly('Ada Lovel')]);
        await list.finishOrdering();
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ben Barrow'), exactly('Ada Lovel')]);
        await cp.reload();
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ben Barrow'), exactly('Ada Lovel')]);
        await expect(list.titleCells()).toHaveText([exactly('Tides'), exactly('Harbours')]);

        // ── "Cancel ordering" (Rule 8b) ───────────────────────────────────
        await list.startOrdering();
        await list.dragAuthorAbove('Tides', 'Ada Lovel', 'Ben Barrow');
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ada Lovel'), exactly('Ben Barrow')]);
        await list.cancelOrdering();
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ben Barrow'), exactly('Ada Lovel')]);

        // ── A contributor deleted (Rule 6; Fields) ────────────────────────
        await cp.frame.selectPage('Contributors');
        const contributors = new ContributorsScreen(page);
        await expect(contributors.row('Ada Lovel')).toHaveCount(1, {timeout: 30_000});
        await contributors.deleteContributor('Ada Lovel');
        await cp.openFromMenu();
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ben Barrow')]);
        await expect(await list.noAuthorsLine('Harbours')).toHaveText(exactly('No Items'));
        await expect(list.authorRows('Harbours')).toHaveCount(0);

        // ── "Tides" deleted (Rule 9; Fields) ──────────────────────────────
        const dialog = await list.openDelete('Tides');
        await expect(dialog.getByRole('heading', {name: 'Delete'})).toBeVisible();
        await expect(dialog.getByText(TEXT.deleteQuestion, {exact: true})).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'OK', exact: true})).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        await list.confirmDelete(dialog);
        await expect(list.titleCells()).toHaveText([exactly('Harbours')]);
        await expect(list.headerLinks()).toHaveText([exactly('Add Chapter')]);
        await cp.reload();
        await expect(list.titleCells()).toHaveText([exactly('Harbours')]);

        // ── Its file freed (Rules 7, 9) ───────────────────────────────────
        const win = await list.openEdit('Harbours');
        expect(sorted(await win.boxStates('files'))).toEqual(['[ ] article.pdf', '[ ] notes.md']);
        await win.cancel();

        // ── Control: Ben Barrow stays on the book (Rule 9) ────────────────
        await cp.frame.selectPage('Contributors');
        await expect(contributors.row('Ben Barrow')).toHaveCount(1, {timeout: 30_000});
        await expect(contributors.row('Ada Lovel')).toHaveCount(0);
    });

    test('S3: The Author builds the chapter list while submitting', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s3', testInfo);
        const press = await scratchPress(ompApi, tag);
        const zed = {givenName: 'Zed', familyName: 'Zephyr', email: `zed${tag}@mail.test`};
        // Given: the Author's draft Edited Volume with one file, no
        // chapters, and only the Author's own entry as contributor.
        const draft = await seedBook(ompApi, `${tag}d`, {
            context: press.path,
            submitter: press.au.username,
            submitted: false,
            workType: 'editedVolume',
            files: [{file: 'article.pdf'}],
        });
        const {page} = await pageAs(asUser, press.au.username);
        const cp = new ChaptersPage(page, press.path, {appContext});
        const {list} = cp;
        await page.goto(wizard.wizardUrl(press.path, draft.submissionId));
        await wizard.expectWizardOpen(page);
        await wizard.continueTo(page, wizard.STEPS.details);

        // ── The "Chapters" section (Rule 2; Fields) ───────────────────────
        const stepHeadings = page.locator('.pkpStep:visible .panelSection__header h2');
        await expect(stepHeadings.last()).toHaveText(exactly('Chapters'), {timeout: 30_000});
        const section = page.locator('.pkpStep:visible .panelSection').filter({has: page.locator('h2', {hasText: exactly('Chapters')})});
        await expect(section.getByText(TEXT.wizardDescription, {exact: true})).toBeVisible();
        await list.expectLoaded();
        await expect(list.emptyListLine()).toHaveText(exactly('No Items'));
        await expect(list.addChapterLink()).toBeVisible();

        // ── "Tides" (Rules 4, 5a, 6) ──────────────────────────────────────
        let win = await list.openAdd();
        expect(await win.boxStates('contributors')).toEqual(['[ ] Ava Author']);
        await win.fill({title: 'Tides', subtitle: 'A Study'});
        await win.contributorBox('Ava Author').check();
        await expectNotice(page, TEXT.saved, () => win.save());
        await expect(list.titleCells()).toHaveText([exactly('Tides')]);
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ava Author')]);

        // ── "Harbours" (Rule 4; Fields) ───────────────────────────────────
        await list.addChapter({title: 'Harbours'});
        await expect(list.titleCells()).toHaveText([exactly('Tides'), exactly('Harbours')]);
        await expect(await list.noAuthorsLine('Harbours')).toHaveText(exactly('No Items'));

        // ── A contributor added later (Rule 6) ────────────────────────────
        await wizard.continueTo(page, wizard.STEPS.contributors);
        await wizard.addContributor(page, {givenName: zed.givenName, familyName: zed.familyName, email: zed.email});
        await wizard.backTo(page, wizard.STEPS.details);
        await list.expectLoaded();
        win = await list.openEdit('Tides');
        expect(await win.boxStates('contributors')).toEqual(['[x] Ava Author', '[ ] Zed Zephyr']);
        await win.contributorBox('Zed Zephyr').check();
        await win.save();
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ava Author'), exactly('Zed Zephyr')]);

        // ── The Review step (Fields, the Review panel; Rule 16) ───────────
        await wizard.continueTo(page, wizard.STEPS.contributors);
        await wizard.continueTo(page, wizard.STEPS.editors);
        await wizard.openReview(page);
        const panelHeads = page.locator('.submissionWizard__reviewPanel__header h3');
        await expect
            .poll(async () => {
                const heads = (await panelHeads.allInnerTexts()).map((s) => s.trim());
                return heads.indexOf('Chapters') - heads.findIndex((h) => /^Details\b/.test(h));
            }, {timeout: 30_000})
            .toBe(1);
        const chaptersPanel = wizard.reviewPanel(page, 'Chapters');
        await expect(chaptersPanel.getByRole('button', {name: 'Edit'})).toBeVisible();
        const items = chaptersPanel.locator('.submissionWizard__reviewPanel__item');
        await expect(items.locator('h4')).toHaveText([exactly('Tides: A Study'), exactly('Harbours')]);
        await expect(items.nth(0).locator('.submissionWizard__reviewPanel__item__value')).toHaveText(exactly('Ava Author, Zed Zephyr'));
        await expect(items.nth(1)).toHaveText(exactly('Harbours'));

        // ── Changes follow at once (Rule 16) ──────────────────────────────
        await wizard.gotoStep(page, wizard.STEPS.details);
        await list.expectLoaded();
        win = await list.openEdit('Tides');
        await win.fill({subtitle: 'A Survey'});
        await win.save();
        await list.confirmDelete(await list.openDelete('Harbours'));
        await expect(list.titleCells()).toHaveText([exactly('Tides')]);
        await wizard.openReview(page, {viaRail: true});
        await expect(items.locator('h4')).toHaveText([exactly('Tides: A Survey')]);

        // ── Submitted (Actors rows 1, 3, 6, 7; Rule 3) ────────────────────
        await expect(wizard.problemsBanner(page)).toHaveCount(0);
        if (await wizard.copyrightCheckbox(page).count()) {
            await wizard.copyrightCheckbox(page).check();
        }
        await wizard.confirmSubmit(page);
        await cp.frame.gotoAuthor(draft.submissionId);
        await cp.openFromMenu();
        await expect(list.titleCells()).toHaveText([exactly('Tides')]);
        await expect(list.authorRows('Tides')).toHaveCount(2);
        await expect(list.titleLinks()).toHaveCount(0);
        await expect(list.addChapterLink()).toHaveCount(0);
        await expect(list.orderLink()).toHaveCount(0);
        await expect(list.rowArrows()).toHaveCount(0);
        await expect(cp.frame.publicationGroup()).toBeVisible();
        await expect(cp.frame.menuLink('Marketing')).toHaveCount(0);
        await expect(cp.frame.header()).toBeVisible();
        await expect(cp.frame.headerButton(WORK_TYPES.editedVolume)).toHaveCount(0);
        await expect(cp.workTypeButton()).toHaveCount(0);

        // ── Control: the Press manager's list (Actors row 3) ──────────────
        const mg = await pageAs(asUser, press.mg.username);
        const mcp = new ChaptersPage(mg.page, press.path, {appContext});
        await mcp.gotoEditorial(draft.submissionId, draft.publicationId);
        await expect(mcp.list.addChapterLink()).toBeVisible();
        await expect(mcp.list.titleLink('Tides')).toBeVisible();
        await expect(mcp.list.rowArrow('Tides')).toBeVisible();
    });

    test('S4: Staff without the permission read a plain-text list', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s4', testInfo);
        const {ben} = people(tag);
        // Given: a Monograph in Copyediting with "Tides" (Ben Barrow), a
        // Copyeditor, a Layout Editor and a Series editor without the
        // metadata-edit permission assigned (footnote s).
        const book = await seedBook(ompApi, tag, {
            contributors: [ben],
            chapters: [{title: 'Tides', authors: [ben.email]}],
            decisions: ['skipExternalReview'],
            participants: [
                {username: COPYEDITOR, role: 'copyeditor'},
                {username: LAYOUT_EDITOR, role: 'layoutEditor'},
                {username: SERIES_EDITOR, role: 'sectionEditor', canChangeMetadata: false},
            ],
        });
        const chaptersUrl = new WorkflowPage(null, PRESS).editorialUrl(book.submissionId, chaptersMenuKey(book.publicationId));

        /** The plain-text list of Rule 3, read settled with its positive control. */
        async function expectPlainList(list) {
            await expect(list.titleCells()).toHaveText([exactly('Tides')]);
            await expect(list.authorNames('Tides')).toHaveText([exactly('Ben Barrow')]);
            await expect(list.titleLinks()).toHaveCount(0);
            await expect(list.addChapterLink()).toHaveCount(0);
            await expect(list.orderLink()).toHaveCount(0);
            await expect(list.rowArrows()).toHaveCount(0);
        }

        // ── The Copyeditor (Actors rows 1, 3; Rule 3) ─────────────────────
        const ce = await pageAs(asUser, COPYEDITOR);
        const cecp = new ChaptersPage(ce.page, PRESS, {appContext});
        await cecp.frame.gotoEditorial(book.submissionId);
        await cecp.openFromMenu();
        await expectPlainList(cecp.list);

        // ── The Series editor (Actors row 3; Settings bullet 6) ───────────
        const se = await pageAs(asUser, SERIES_EDITOR);
        const secp = new ChaptersPage(se.page, PRESS, {appContext});
        await secp.frame.gotoEditorial(book.submissionId);
        await secp.openFromMenu();
        await expectPlainList(secp.list);

        // ── The Layout Editor, outside its stage (Actors row 1) ───────────
        const le = await pageAs(asUser, LAYOUT_EDITOR);
        const lecp = new ChaptersPage(le.page, PRESS, {appContext});
        await lecp.frame.gotoEditorial(book.submissionId);
        await expect(lecp.frame.publicationGroup()).toBeVisible();
        await expect(lecp.frame.stageLink('Copyediting')).toBeVisible();
        expect(await lecp.frame.versionNodeLabels()).toEqual([]);
        await le.page.goto(chaptersUrl);
        await lecp.frame.expectOpen(book.submissionId);
        await expect(lecp.frame.noAccessBox()).toHaveText(NO_ACCESS, {timeout: 30_000});
        await expect(lecp.list.grid()).toHaveCount(0);

        // ── Control: the Press manager (Actors row 3) ─────────────────────
        const mg = await pageAs(asUser, MANAGER);
        const mcp = new ChaptersPage(mg.page, PRESS, {appContext});
        await mcp.gotoEditorial(book.submissionId, book.publicationId);
        await expect(mcp.list.addChapterLink()).toBeVisible();
        await expect(mcp.list.titleLink('Tides')).toBeVisible();
        await expect(mcp.list.rowArrow('Tides')).toBeVisible();
    });

    test('S5: The work type changed from the header', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s5', testInfo);
        const {ben} = people(tag);
        // Given: a Monograph with "Tides" (Ben Barrow; article.pdf).
        const book = await seedBook(ompApi, tag, {
            contributors: [ben],
            files: [{file: 'article.pdf'}],
            chapters: [{title: 'Tides', authors: [ben.email], files: ['files.0']}],
        });
        const {page} = await pageAs(asUser, MANAGER);
        const cp = new ChaptersPage(page, PRESS, {appContext});
        const {list} = cp;
        await cp.gotoEditorial(book.submissionId, book.publicationId);

        /** "Tides"' window: "License URL" (with `license` in it) or none, and Ben and article.pdf still ticked. */
        async function expectTidesWindow(license) {
            const win = await list.openEdit('Tides');
            await expect(win.pagesBox()).toBeVisible();
            if (license === null) {
                await expect(win.licenseUrlBox()).toHaveCount(0);
            } else {
                await expect(win.licenseUrlBox()).toHaveValue(license);
            }
            await expect(win.contributorBox('Ben Barrow')).toBeChecked();
            await expect(win.fileBox('article.pdf')).toBeChecked();
            return win;
        }

        // ── The button (Fields, the work-type control) ────────────────────
        await expect(cp.workTypeButton()).toHaveText(exactly(WORK_TYPES.monograph));
        expect(await cp.openWorkTypeMenu()).toEqual([WORK_TYPES.editedVolume, WORK_TYPES.monograph]);
        await cp.workTypeButton().click();
        await expect(page.getByRole('menuitem')).toHaveCount(0);

        // ── "Edited Volume" (Rule 13a) ────────────────────────────────────
        await cp.chooseWorkType(WORK_TYPES.editedVolume);
        await expect(cp.workTypeButton()).toHaveText(exactly(WORK_TYPES.editedVolume), {timeout: 30_000});
        await expect(page.getByRole('dialog')).toHaveCount(1);
        await expect(page.getByRole('alertdialog')).toHaveCount(0);
        await cp.reload();
        await expect(cp.workTypeButton()).toHaveText(exactly(WORK_TYPES.editedVolume));

        // ── The chapter kept (Rules 12a, 13b; Settings bullet 2) ──────────
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ben Barrow')]);
        let win = await expectTidesWindow('');
        await win.fill({licenseUrl: OWN_LICENSE});
        await win.save();

        // ── Back to "Monograph" (Rule 13b) ────────────────────────────────
        await cp.chooseWorkType(WORK_TYPES.monograph);
        await expect(cp.workTypeButton()).toHaveText(exactly(WORK_TYPES.monograph), {timeout: 30_000});
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ben Barrow')]);
        win = await expectTidesWindow(null);
        await win.cancel();

        // ── "Edited Volume" again (Rule 13b) ──────────────────────────────
        await cp.chooseWorkType(WORK_TYPES.editedVolume);
        await expect(cp.workTypeButton()).toHaveText(exactly(WORK_TYPES.editedVolume), {timeout: 30_000});
        win = await expectTidesWindow(OWN_LICENSE);
        await win.cancel();

        // ── Control: the entry the button already reads (Rule 13a) ───────
        await cp.chooseWorkType(WORK_TYPES.editedVolume);
        await expect(page.getByRole('menuitem')).toHaveCount(0);
        await expect(cp.workTypeButton()).toHaveText(exactly(WORK_TYPES.editedVolume));
        win = await expectTidesWindow(OWN_LICENSE);
        await win.cancel();
        await cp.reload();
        await expect(cp.workTypeButton()).toHaveText(exactly(WORK_TYPES.editedVolume));
    });

    test('S6: Chapters with their own publication dates', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s6', testInfo);
        // Given: a Monograph with "Tides" and no "Publication Dates" choice.
        const book = await seedBook(ompApi, tag, {chapters: [{title: 'Tides'}]});
        const {page} = await pageAs(asUser, MANAGER);
        const cp = new ChaptersPage(page, PRESS, {appContext});
        const {list} = cp;
        await cp.gotoEditorial(book.submissionId, book.publicationId);

        /** "Tides"' window with or without "Date Published" (its value when shown). */
        async function tidesDate(expected) {
            const win = await list.openEdit('Tides');
            await expect(win.pagesBox()).toBeVisible();
            if (expected === null) {
                await expect(win.datePublishedBox()).toHaveCount(0);
            } else {
                await expect(win.datePublishedBox()).toBeVisible();
                if (expected !== undefined) {
                    await expect(win.datePublishedBox()).toHaveValue(expected);
                }
            }
            return win;
        }

        // ── No choice saved (Rule 11) ─────────────────────────────────────
        let win = await tidesDate(null);
        await win.cancel();

        // ── The "Publication Dates" page (Fields; Rule 11) ────────────────
        await cp.openPublicationDates();
        await cp.frame.expectHeading('Marketing: Publication Dates');
        await expect(cp.publicationDatesGroup().getByRole('radio')).toHaveCount(2);
        await expect(cp.publicationDatesRadio(PUBLICATION_DATES.book)).not.toBeChecked();
        await expect(cp.publicationDatesRadio(PUBLICATION_DATES.chapter)).not.toBeChecked();
        await expect(cp.publicationDatesSave()).toBeVisible();

        // ── "Each chapter may have its own publication date." (Rule 11) ───
        await cp.savePublicationDates(PUBLICATION_DATES.chapter);
        await cp.openFromMenu();
        win = await tidesDate(undefined);
        await win.typeDatePublished('2024-05-01');
        await win.save();
        win = await tidesDate('2024-05-01');
        await win.cancel();

        // ── "All chapters will use the publication date…" (Rule 11) ───────
        await cp.openPublicationDates();
        await cp.savePublicationDates(PUBLICATION_DATES.book);
        await cp.openFromMenu();
        win = await tidesDate(null);
        await win.cancel();

        // ── Control: the first option again (Rule 11) ─────────────────────
        await cp.openPublicationDates();
        await cp.savePublicationDates(PUBLICATION_DATES.chapter);
        await cp.openFromMenu();
        win = await tidesDate('2024-05-01');
        await win.cancel();
    });

    test("S7: A published book's chapters", async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s7', testInfo);
        const press = await scratchPress(ompApi, tag);
        // Given: the Author's published Monograph with "Tides" and "Harbours".
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            published: true,
            chapters: [{title: 'Tides'}, {title: 'Harbours'}],
        });
        const {page} = await pageAs(asUser, press.mg.username);
        const cp = new ChaptersPage(page, press.path, {appContext});
        const {list} = cp;
        await cp.gotoEditorial(book.submissionId, book.publicationId);

        // ── The warning (Rule 14; Actors row 4) ───────────────────────────
        const warning = cp.mainText(TEXT.publishedWarning);
        await expect(warning).toBeVisible();
        const warningBox = await warning.boundingBox();
        const gridBox = await list.grid().boundingBox();
        expect(warningBox && gridBox && warningBox.y < gridBox.y, 'the warning stands above the list').toBe(true);
        await expect(list.headerLinks()).toHaveText([exactly('Order'), exactly('Add Chapter')]);
        await expect(list.titleLinks()).toHaveText([exactly('Tides'), exactly('Harbours')]);
        await expect(list.rowArrows()).toHaveCount(2);

        // ── A chapter added (Rules 4, 14) ─────────────────────────────────
        await expectNotice(page, TEXT.saved, () => list.addChapter({title: 'Epilogue'}));
        await expect(list.titleCells()).toHaveText(['Tides', 'Harbours', 'Epilogue'].map(exactly));
        await cp.reload();
        await expect(list.titleCells()).toHaveText(['Tides', 'Harbours', 'Epilogue'].map(exactly));

        // ── The work type of a published book (Rule 13a) ──────────────────
        await cp.chooseWorkType(WORK_TYPES.editedVolume);
        await expect(cp.workTypeButton()).toHaveText(exactly(WORK_TYPES.editedVolume), {timeout: 30_000});
        const win = await list.openEdit('Tides');
        await expect(win.licenseUrlBox()).toBeVisible();
        await win.cancel();

        // ── Control: the Author's view (Rules 3, 14) ──────────────────────
        const au = await pageAs(asUser, press.au.username);
        const acp = new ChaptersPage(au.page, press.path, {appContext});
        await acp.frame.gotoAuthor(book.submissionId);
        await acp.openFromMenu();
        await expect(acp.mainText(TEXT.publishedAuthor)).toBeVisible();
        await expect(acp.list.titleCells()).toHaveText(['Tides', 'Harbours', 'Epilogue'].map(exactly));
        await expect(acp.list.titleLinks()).toHaveCount(0);
        await expect(acp.list.addChapterLink()).toHaveCount(0);
        await expect(acp.list.orderLink()).toHaveCount(0);
        await expect(acp.list.rowArrows()).toHaveCount(0);
    });

    test('S8: Chapter licenses on an Edited Volume', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s8', testInfo);
        const press = await scratchPress(ompApi, tag);
        const production = {decisions: ['skipExternalReview', 'sendToProduction']};
        // Given: three books in Production on a press with no license.
        const first = await seedBook(ompApi, `${tag}v`, {
            context: press.path,
            submitter: press.au.username,
            workType: 'editedVolume',
            ...production,
            chapters: [{title: 'Tides'}, {title: 'Harbours', licenseUrl: OWN_LICENSE}],
        });
        const second = await seedBook(ompApi, `${tag}w`, {
            context: press.path,
            submitter: press.au.username,
            workType: 'editedVolume',
            ...production,
            chapters: [{title: 'Tides'}],
        });
        const monograph = await seedBook(ompApi, `${tag}m`, {
            context: press.path,
            submitter: press.au.username,
            ...production,
            chapters: [{title: 'Tides'}],
        });
        const {page} = await pageAs(asUser, press.mg.username);
        const cp = new ChaptersPage(page, press.path, {appContext});
        const {list} = cp;
        const licensePage = (book) => cp.frame.gotoEditorial(book.submissionId, {menuKey: `publication_${book.publicationId}_license`});
        // The licenses have no scenario key: typed on each version's
        // "Permissions & Disclosure" page before the scenario (footnote s).
        await licensePage(first);
        await saveLicenseFields(page, {licenseUrl: VERSION_LICENSE});
        await licensePage(second);
        await saveLicenseFields(page, {chapterLicenseUrl: CHAPTER_DEFAULT});
        await licensePage(monograph);
        await saveLicenseFields(page, {licenseUrl: VERSION_LICENSE});

        // ── The version's license (Rule 12a) ──────────────────────────────
        await cp.gotoEditorial(first.submissionId, first.publicationId);
        let win = await list.openEdit('Tides');
        await expect(win.licenseUrlBox()).toHaveValue('');
        await expect(win.licenseSentence()).toHaveText(TEXT.licenseSentence(VERSION_LICENSE));
        await win.cancel();

        // ── A chapter's own address (Rule 12a) ────────────────────────────
        win = await list.openEdit('Harbours');
        await expect(win.licenseUrlBox()).toHaveValue(OWN_LICENSE);
        await win.cancel();

        // ── The chapter default (Rule 12a; Settings bullet 3) ─────────────
        await cp.gotoEditorial(second.submissionId, second.publicationId);
        win = await list.openEdit('Tides');
        await expect(win.licenseUrlBox()).toHaveValue('');
        await expect(win.licenseSentence()).toHaveText(TEXT.licenseSentence(CHAPTER_DEFAULT));
        await win.cancel();

        // ── Published (Rule 12b; Side effects bullet 4) ───────────────────
        await cp.frame.gotoEditorial(first.submissionId, {menuKey: `publication_${first.publicationId}_titleAbstract`});
        await publishFromWorkflow(page);
        await cp.gotoEditorial(first.submissionId, first.publicationId);
        win = await list.openEdit('Tides');
        await expect(win.licenseUrlBox()).toHaveValue(VERSION_LICENSE);
        await win.cancel();
        win = await list.openEdit('Harbours');
        await expect(win.licenseUrlBox()).toHaveValue(OWN_LICENSE);
        await win.cancel();

        // ── Control: the Monograph (Rule 12a) ─────────────────────────────
        await cp.gotoEditorial(monograph.submissionId, monograph.publicationId);
        win = await list.openEdit('Tides');
        await expect(win.pagesBox()).toBeVisible();
        await expect(win.licenseUrlBox()).toHaveCount(0);
        await expect(win.licenseSentence()).toHaveCount(0);
        await win.cancel();
    });

    test('S9: Chapter DOIs follow "Chapter Page"', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s9', testInfo);
        const press = await scratchPress(ompApi, tag, {
            enableDois: true,
            doiPrefix: '10.1234',
            enabledDoiTypes: ['publication', 'chapter'],
            doiCreationTime: 'publication',
        });
        // Given: a published book whose "Tides" had "Chapter Page" ticked
        // at publishing and whose "Harbours" did not.
        const book = await seedBook(ompApi, `${tag}b`, {
            context: press.path,
            submitter: press.au.username,
            published: true,
            chapters: [{title: 'Tides', page: true}, {title: 'Harbours'}],
        });
        const {page} = await pageAs(asUser, press.mg.username);
        const cp = new ChaptersPage(page, press.path, {appContext});
        const {list} = cp;
        await cp.gotoEditorial(book.submissionId, book.publicationId);

        // ── "Tides" (Fields; Rule 10; Settings bullet 4) ──────────────────
        let win = await list.openEdit('Tides');
        await expect(win.chapterPageBox()).toBeChecked();
        await expect(win.doiNote()).toBeVisible();

        // ── Unticked and saved (Rule 10) ──────────────────────────────────
        await win.chapterPageBox().uncheck();
        await expectNotice(page, TEXT.saved, () => win.save());
        win = await list.openEdit('Tides');
        await expect(win.chapterPageBox()).toBeChecked();
        await expect(win.doiNote()).toBeVisible();
        await win.cancel();

        // ── "Harbours" (Settings bullet 4) ────────────────────────────────
        win = await list.openEdit('Harbours');
        await expect(win.chapterPageBox()).not.toBeChecked();
        await expect(win.doiNote()).toHaveCount(0);
        await win.chapterPageBox().check();
        await win.save();
        win = await list.openEdit('Harbours');
        await expect(win.chapterPageBox()).toBeChecked();
        await expect(win.doiNote()).toHaveCount(0);
        await win.cancel();

        // ── Control: the seeded press, no chapter DOIs (Settings bullet 4) ─
        const control = await seedBook(ompApi, `${tag}c`, {published: true, chapters: [{title: 'Tides', page: true}]});
        const mg = await pageAs(asUser, MANAGER);
        const mcp = new ChaptersPage(mg.page, PRESS, {appContext});
        await mcp.gotoEditorial(control.submissionId, control.publicationId);
        win = await mcp.list.openEdit('Tides');
        await expect(win.chapterPageBox()).toBeChecked();
        await expect(win.doiNote()).toHaveCount(0);
        await win.cancel();
    });

    test('S10: A new version copies the chapters', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s10', testInfo);
        const {ada, ben} = people(tag);
        // Given: a published Monograph with "Tides" (A Study, 1-24, Chapter
        // Page ticked, Ben Barrow) and "Harbours" (25-40, Ada Lovel).
        const book = await seedBook(ompApi, tag, {
            published: true,
            contributors: [ada, ben],
            chapters: [
                {title: 'Tides', subtitle: 'A Study', pages: '1-24', page: true, authors: [ben.email]},
                {title: 'Harbours', pages: '25-40', authors: [ada.email]},
            ],
        });
        const {page} = await pageAs(asUser, MANAGER);
        const cp = new ChaptersPage(page, PRESS, {appContext});
        const {list} = cp;

        // ── "Create New Version" (Rule 15) ────────────────────────────────
        await cp.frame.gotoEditorial(book.submissionId);
        const newPublicationId = await createNewVersion(page);
        await cp.gotoEditorial(book.submissionId, newPublicationId);
        await expect(list.titleCells()).toHaveText([exactly('Tides'), exactly('Harbours')]);
        await expect(list.authorNames('Tides')).toHaveText([exactly('Ben Barrow')]);
        await expect(list.authorNames('Harbours')).toHaveText([exactly('Ada Lovel')]);

        // ── "Tides" copied (Rule 15) ──────────────────────────────────────
        const win = await list.openEdit('Tides');
        await expect(win.titleBox()).toHaveValue('Tides');
        await expect(win.subtitleBox()).toHaveValue('A Study');
        await expect(win.pagesBox()).toHaveValue('1-24');
        await expect(win.chapterPageBox()).toBeChecked();
        await expect(win.contributorBox('Ben Barrow')).toBeChecked();
        await win.cancel();

        // ── A chapter on the new version (Rule 4) ─────────────────────────
        await list.addChapter({title: 'Coda'});
        await expect(list.titleCells()).toHaveText(['Tides', 'Harbours', 'Coda'].map(exactly));

        // ── Control: the earlier version (Rule 2) ─────────────────────────
        await cp.gotoEditorial(book.submissionId, book.publicationId);
        await expect(list.titleCells()).toHaveText([exactly('Tides'), exactly('Harbours')]);
    });

    test('S11: No chapters on a journal or a preprint server: the absence, its press control', async ({asUser, ompApi, appContext}, testInfo) => {
        const tag = makeTag('s11', testInfo);
        const draft = await seedBook(ompApi, `${tag}d`, {submitted: false});
        const submitted = await seedBook(ompApi, `${tag}s`);

        // The Author's new submission asks for "Submission Type" (Rule 1).
        const au = await pageAs(asUser, AUTHOR);
        await au.page.goto(wizard.startUrl(PRESS));
        await expect(au.page.getByRole('heading', {name: /Make a Submission/}).first()).toBeVisible({timeout: 30_000});
        await expect(wizard.startFormLegend(au.page, 'Submission Type')).toBeVisible();
        await expect(au.page.getByRole('radio', {name: /^Monograph: Authors are associated/})).toBeChecked();

        // The Author's draft book shows a "Chapters" section on its Details step (Rule 2).
        await au.page.goto(wizard.wizardUrl(PRESS, draft.submissionId));
        await wizard.expectWizardOpen(au.page);
        await wizard.continueTo(au.page, wizard.STEPS.details);
        const stepHeadings = au.page.locator('.pkpStep:visible .panelSection__header h2');
        await expect(stepHeadings.last()).toHaveText(exactly('Chapters'), {timeout: 30_000});
        await expect(au.page.getByText(TEXT.wizardDescription, {exact: true})).toBeVisible();

        // The Press manager's submitted book: "Chapters" under its version,
        // a header button reading "Monograph", a side-menu group "Marketing"
        // (Fields).
        const mg = await pageAs(asUser, MANAGER);
        const cp = new ChaptersPage(mg.page, PRESS, {appContext});
        await cp.frame.gotoEditorial(submitted.submissionId);
        await expect.poll(() => cp.frame.pagesUnderLatestVersion(), {timeout: 30_000}).toContain('Chapters');
        await expect(cp.workTypeButton()).toHaveText(exactly(WORK_TYPES.monograph));
        await expect(cp.frame.menuLink('Marketing')).toBeVisible();
    });
});
