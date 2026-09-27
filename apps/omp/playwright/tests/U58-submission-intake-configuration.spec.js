// @ts-check
/**
 * @file playwright/tests/U58-submission-intake-configuration.spec.js
 *
 * Submission intake configuration — OMP suite, one test per canonical
 * scenario (S1–S7, all common), in the press's own context: Press
 * Manager, Series editor, Funding Coordinator, "This press …", the
 * "Monograph Components" list with its fifteen rows from "Appendix" to
 * "Other" ("Book Manuscript" required, OMP3), "Enable type metadata"
 * ticked on a new press (OMP3), the About › "Submissions" page with no
 * section block (a press shows none), "Index" as the component a file
 * carries and "Prospectus" as the one deleted.
 * Spec: docs/specs/U58-submission-intake-configuration.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 ❓: S6 and S7 read an added component listed, never its place.
 * - A2 🐞, A3 ❓, A4 ❓, A6 ❓, A9 🐞, A10 🐞, A11 ❓: no test reads them.
 * - A5 ❓: the Reader's "view your pending submissions" is never pressed.
 * - A7 🐞, A8 🐞: no help text is read.
 * - A12 🐞: S7 closes the pop-up and presses "Cancel", never reading the
 *   spinner or pressing "OK" again.
 * - OMP1 🐞: the "Copyright notice" box is found by its editor id, never by
 *   its label; the "Disable Submissions" help is never read.
 * - OMP2 🐞: S3's "Edit" beside "Copyright Notice" is the journal's and the
 *   server's bullet ({OJS OPS}); a press's link is never pressed.
 * - OJS1, OPS1, OPS2: another app's territory.
 *
 * Seeding: scenario endpoints only. S1 reads the seeded press
 * `publicknowledge` signed out and changes nothing; S2–S7 each seed their
 * own scratch press (`POST scenarios/context`) with throwaway accounts
 * (footnote s): S4 through the passthroughs `plugins`
 * (`makesubmissionblockplugin` enabled) and `sidebar`, S7 through
 * `components` ("Field Notes" added), a submitted monograph whose file
 * carries "Index" (`files[].genre`) and a draft (`submitted: false`), as S3.
 * Every setting a scenario changes is changed on the tabs themselves, the
 * feature under test. Signed-out reads run in a context with an empty
 * storage state (patterns.md, parallel lesson 8); every actor gets its own
 * `asUser` context, so no test sets a default user. Nothing is global, so
 * the suite runs in the parallel `omp` project. No hard-coded waits (A5).
 */
const {test, expect} = require('../support/fixtures.js');
const {
    WorkflowSubmissionSettings,
    AboutSubmissionsPage,
    saveWatchingStatus,
} = require('../../../../shared/playwright/pages/SubmissionIntakePages.js');
const {SettingsPages} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');
const {notices, markNotices, pastCloseWindow} = require('../../../../shared/playwright/pages/SectionsPages.js');
const {wizardUrl, expectWizardOpen, expectStep, STEPS} = require('../pages/SubmissionWizardPages.js');

const PK = 'publicknowledge';
const T = 30_000;

const LOGIN_LINE = 'Login or Register to make a submission.';
const SIGNED_IN_LINE = 'Make a new submission or view your pending submissions.';
const NOT_ACCEPTING = 'This press is not accepting submissions at this time.';
const GUIDELINES_OPENING = 'Authors are invited to make a submission to this press.';
const CHECKLIST_OPENING = 'All submissions must meet the following requirements.';
const UPLOAD_DEFAULT_OPENING = 'Provide any files our editorial team may need to evaluate your submission.';
const REQUIRED = 'This field is required.';
const KEY_MALFORMED =
    'The key can contain only alphanumeric characters, underscores, and hyphens, and must begin and end with an alphanumeric character.';
const KEY_TAKEN = 'The key already exists.';
const FORM_CHANGED = 'The data on this form has changed. Do you wish to continue without saving?';
const DELETE_QUESTION = 'Are you sure you wish to delete this item? This action cannot be undone.';
const DELETE_REFUSED =
    'Before this component can be deleted, you must associate all related submission files with a different component.';
const RESTORE_QUESTION = 'Are you sure you wish to restore the defaults?';
const REQUIRE_YES = 'Yes, require submitting authors to upload one or more of these files.';
const REQUIRE_NO = 'No, allow new submissions without these files.';

/** A press's side tabs of "Submission" (Fields; no "Author Screening", OPS2). */
const SIDE_TABS = ['Disable Submissions', 'Author Guidance', 'Metadata', 'Components', 'Contributor Roles'];

/** A new press's components, in order (OMP3). */
const PRESS_COMPONENTS = [
    'Appendix',
    'Bibliography',
    'Book Manuscript',
    'Chapter Manuscript',
    'Glossary',
    'Index',
    'Preface',
    'Prospectus',
    'Table',
    'Figure',
    'Photo',
    'Illustration',
    'Image',
    'HTML Stylesheet',
    'Other',
];

const KEYWORDS_BOX = 'Enable keyword metadata';
const KEYWORDS_ASK = 'Ask the author to suggest keywords during submission.';
const KEYWORDS_REQUIRE = 'Require the author to suggest keywords before accepting their submission.';
const KEYWORDS_NONE = 'Do not request keywords from the author during submission.';
const SUBJECTS_BOX = 'Enable subject metadata';
const TYPE_BOX = 'Enable type metadata';
const TYPE_NONE = 'Do not request the type from the author during submission.';
const REFERENCES_BOX = 'Enable references metadata';
const LOOKUP_BOX = 'Enable references structuring and metadata lookup';
const FUNDERS_BOX = 'Enable funder metadata';
const GRANT_BOX = 'Enable Grant ID validation.';
const COVERAGE_BOX = 'Enable coverage metadata';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u58${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A signed-out browser page on the worker's server (no inherited storage state). */
async function signedOutPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'});
    return context.newPage();
}

/** A signed-in actor's page. */
async function actorPage(asUser, username) {
    return (await asUser(username)).newPage();
}

/** The press's "Submissions" page, opened by its address. */
async function openSubmissionsPage(page, contextPath, options = {}) {
    const about = new AboutSubmissionsPage(page, contextPath, options);
    await about.open();
    return about;
}

/** Every part heading of the page, "Edit" and its screen-reader words left out. */
async function expectPartHeadings(about, headings) {
    await expect(about.partHeadings()).toHaveCount(headings.length, {timeout: T});
    for (let i = 0; i < headings.length; i++) {
        await expect(about.partHeadings().nth(i)).toHaveText(new RegExp(`^\\s*${headings[i]}(\\s|$)`));
    }
}

/**
 * The notice line reads `sentence` (white space collapsed) and carries the
 * given link words (none for the not-accepting sentence).
 */
async function expectNoticeLine(about, sentence, links) {
    await expect(about.notice()).toHaveText(sentence, {useInnerText: true, timeout: T});
    await expect(about.noticeLinks()).toHaveText(links, {timeout: T});
}

/**
 * Open the journal's components by typing the programming interface's
 * address (the scenario's own step, footnote s): the answer's status and
 * the component names it lists (none when refused).
 */
async function readComponentsApi(page, contextPath) {
    const response = await page.goto(`/index.php/${contextPath}/api/v1/genres`);
    if (!response) throw new Error('no answer for the components address');
    const body = await response.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    return {status: response.status(), names: items.map((g) => (typeof g.name === 'string' ? g.name : g.name && g.name.en))};
}

/** The side menu's landing after "view your pending submissions": the list heading. */
function listHeading(page, name) {
    return page.getByRole('heading', {name});
}

/**
 * Drag a component row onto the top of another. The press's list is long
 * enough that its last row sits below the fold on landing, and the mouse
 * drag works only on rows inside the viewport: the list is scrolled to
 * the top of the viewport first (proposed for the page object as
 * `ComponentsList.dragIntoView`).
 */
async function dragInView(list, from, to) {
    await list.grid().evaluate((el) => el.scrollIntoView({block: 'start'}));
    const box = await list.row(from).first().boundingBox();
    const viewport = list.page.viewportSize();
    if (!box || !viewport || box.y + box.height > viewport.height) {
        throw new Error(`dragInView: "${from}" is not inside the viewport`);
    }
    await list.drag(from, to);
}

/**
 * The component window's "Close" after a change: the browser's question is
 * answered from a listener armed before the press, because the question is
 * raised inside the press and a press whose question nobody answers never
 * returns (the page object's `closeAsked` awaits the press first and hangs;
 * proposed fix: arm `page.once('dialog')` before the click). Returns the
 * question; the window closes unsaved.
 */
async function closeAskedAccepted(page, win) {
    /** @type {string|null} */
    let message = null;
    page.once('dialog', (d) => {
        message = d.message();
        d.accept().catch(() => {});
    });
    await win.closeButton().click();
    await expect(win.form()).toHaveCount(0, {timeout: T});
    await pastCloseWindow(page);
    return message;
}

/**
 * A draft's wizard, opened on "Upload Files" (a seeded draft opens there,
 * seed-facts 2026-09-27).
 */
async function openDraft(page, contextPath, submissionId) {
    await page.goto(wizardUrl(contextPath, submissionId));
    await expectWizardOpen(page);
    await expectStep(page, STEPS.files);
}

/**
 * Upload a file on the wizard's "Upload Files" step and open the
 * component choice for it ("Other" in the file's prompt opens the file's
 * window with every component the upload offers). Returns the window.
 */
async function uploadAndOpenComponentChoice(page) {
    await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles({
        name: 'u58-upload.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('U58 upload'),
    });
    const prompt = page.locator('.listPanel--submissionFiles__setGenre');
    await expect(prompt).toBeVisible({timeout: T});
    await prompt.getByRole('button', {name: 'Other', exact: true}).click();
    const win = page.getByRole('dialog').filter({has: page.getByRole('radio')}).last();
    await expect(win.getByRole('radio').first()).toBeVisible({timeout: T});
    return win;
}

test.describe('submission intake configuration', () => {
    test('S1: a visitor reads the "Submissions" page', {tag: '@smoke'}, async ({browser, baseURL}) => {
        const page = await signedOutPage(browser, baseURL);
        const about = new AboutSubmissionsPage(page, PK, {locale: 'en'});

        // The page, from the header's "About" menu.
        await about.gotoHome();
        await about.openFromMenu();
        await expect(page).toHaveURL(/\/publicknowledge\/en\/about\/submissions$/);
        expect(await about.breadcrumbTrail()).toEqual(['Home', 'Submissions']);
        await expect(about.pageHeading()).toBeVisible();
        await expectNoticeLine(about, LOGIN_LINE, ['Login', 'Register']);

        // The parts, in order (a press has no section block).
        await expectPartHeadings(about, ['Author Guidelines', 'Submission Preparation Checklist', 'Privacy Statement']);
        expect(await about.partText('Author Guidelines')).toMatch(new RegExp(`^${GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        expect(await about.partText('Submission Preparation Checklist')).toMatch(new RegExp(`^${CHECKLIST_OPENING.replace(/\./g, '\\.')}`));

        // Control: no "Copyright Notice" part and no "Edit" link beside any
        // heading, read on the same settled page as the three parts above.
        await expect(about.part('Copyright Notice')).toHaveCount(0);
        await expect(about.editLinks()).toHaveCount(0);
        await expect(about.part('Privacy Statement')).toHaveCount(1);

        // "Login": the Login page. Back.
        await about.noticeLink('Login').click();
        await expect(page.locator('form#login')).toBeVisible({timeout: T});
        await page.goBack();
        await expect(about.pageHeading()).toBeVisible({timeout: T});

        // "Register": the press's Register page.
        await about.noticeLink('Register').click();
        await expect(page).toHaveURL(/\/index\.php\/publicknowledge\/(en\/)?user\/register/, {timeout: T});
        await expect(page.locator('form#register')).toBeVisible({timeout: T});
        await page.context().close();
    });

    test('S2: each role\'s links on the "Submissions" page', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const users = {
            manager: `${tag}mgr`,
            seriesEditor: `${tag}sed`,
            assistant: `${tag}fun`,
            author: `${tag}au`,
            reviewer: `${tag}rev`,
            authorReviewer: `${tag}aurev`,
            reader: `${tag}rd`,
        };
        await ompApi.createContext({
            tag,
            users: [
                {username: users.manager, roles: ['manager']},
                {username: users.seriesEditor, roles: ['sectionEditor']},
                {username: users.assistant, roles: ['funding']},
                {username: users.author, roles: ['author']},
                {username: users.reviewer, roles: ['externalReviewer']},
                {username: users.authorReviewer, roles: ['author', 'externalReviewer']},
                {username: users.reader, roles: ['reader']},
            ],
        });
        const PARTS = ['Author Guidelines', 'Submission Preparation Checklist', 'Privacy Statement'];

        // The Press Manager's page, from the header's "About" menu.
        const mgrPage = await actorPage(asUser, users.manager);
        const mgrAbout = new AboutSubmissionsPage(mgrPage, tag);
        await mgrAbout.gotoHome();
        await mgrAbout.openFromMenu();
        await expectNoticeLine(mgrAbout, SIGNED_IN_LINE, ['Make a new submission', 'view your pending submissions']);
        await expectPartHeadings(mgrAbout, PARTS);
        for (const part of PARTS) {
            await expect(mgrAbout.partEditLink(part)).toHaveCount(1);
        }
        await expect(mgrAbout.editLinks()).toHaveCount(PARTS.length);

        // The "Edit" links: "Author Guidance" twice, then the website's
        // "Privacy Statement".
        const workflow = new WorkflowSubmissionSettings(mgrPage, tag, {listTitle: 'Monograph Components'});
        for (const part of ['Author Guidelines', 'Submission Preparation Checklist']) {
            await mgrAbout.partEditLink(part).click();
            await workflow.waitLoaded();
            await expect(workflow.submissionTab).toHaveAttribute('aria-selected', 'true', {timeout: T});
            await expect(workflow.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
            await expect(workflow.sideTab('Disable Submissions')).toHaveAttribute('aria-selected', 'false');
            await expect(workflow.sidePanel('Author Guidance')).toBeVisible({timeout: T});
            // "Go back": the settings page wrote its side tab into the
            // address, so one history step stays on it; the page is opened
            // again by its address instead.
            await mgrAbout.open();
        }
        await mgrAbout.partEditLink('Privacy Statement').click();
        const settings = new SettingsPages(mgrPage, tag);
        await expect(settings.heading).toHaveText(/^\s*Website Settings\s*$/, {timeout: T});
        await expect(settings.tab('Setup')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await expect(settings.selectedSideTab('Setup')).toHaveText(/^\s*Privacy Statement\s*$/, {timeout: T});
        await settings.privacyForm().ready();

        // The Press Manager's pending submissions: "Assigned to me".
        await mgrAbout.open();
        await mgrAbout.noticeLink('view your pending submissions').click();
        await expect(listHeading(mgrPage, /Assigned to me/)).toBeVisible({timeout: T});

        // The Series editor and the assistant: the same line, no "Edit";
        // pending submissions open "Assigned to me".
        for (const who of [users.seriesEditor, users.assistant]) {
            const page = await actorPage(asUser, who);
            const about = await openSubmissionsPage(page, tag);
            await expectNoticeLine(about, SIGNED_IN_LINE, ['Make a new submission', 'view your pending submissions']);
            await expectPartHeadings(about, PARTS);
            await expect(about.editLinks()).toHaveCount(0);
            await about.noticeLink('view your pending submissions').click();
            await expect(listHeading(page, /Assigned to me/)).toBeVisible({timeout: T});
        }

        // The Author: the same line, no "Edit"; "My Submissions" on
        // "Active submissions"; back, "Make a new submission": the start
        // screen with "Begin Submission".
        const authorPage = await actorPage(asUser, users.author);
        const authorAbout = await openSubmissionsPage(authorPage, tag);
        await expectNoticeLine(authorAbout, SIGNED_IN_LINE, ['Make a new submission', 'view your pending submissions']);
        await expectPartHeadings(authorAbout, PARTS);
        await expect(authorAbout.editLinks()).toHaveCount(0);
        await authorAbout.noticeLink('view your pending submissions').click();
        await expect(listHeading(authorPage, /Active submissions/)).toBeVisible({timeout: T});
        await authorPage.goBack();
        await expect(authorAbout.pageHeading()).toBeVisible({timeout: T});
        await authorAbout.noticeLink('Make a new submission').click();
        await expect(authorPage.getByRole('heading', {name: /Make a Submission/}).first()).toBeVisible({timeout: T});
        await expect(authorPage.getByRole('button', {name: 'Begin Submission'})).toBeVisible({timeout: T});

        // The Author reads the components: "Book Manuscript" among them.
        const authorRead = await readComponentsApi(authorPage, tag);
        expect(authorRead.status).toBe(200);
        expect(authorRead.names).toContain('Book Manuscript');

        // The Reviewer: the same line, no "Edit"; the reviewer dashboard on
        // "Action Required by me"; the start screen; the components refused.
        const reviewerPage = await actorPage(asUser, users.reviewer);
        const reviewerAbout = await openSubmissionsPage(reviewerPage, tag);
        await expectNoticeLine(reviewerAbout, SIGNED_IN_LINE, ['Make a new submission', 'view your pending submissions']);
        await expectPartHeadings(reviewerAbout, PARTS);
        await expect(reviewerAbout.editLinks()).toHaveCount(0);
        await reviewerAbout.noticeLink('view your pending submissions').click();
        await expect(listHeading(reviewerPage, /Action Required by me/)).toBeVisible({timeout: T});
        await reviewerPage.goBack();
        await expect(reviewerAbout.pageHeading()).toBeVisible({timeout: T});
        await reviewerAbout.noticeLink('Make a new submission').click();
        await expect(reviewerPage.getByRole('heading', {name: /Make a Submission/}).first()).toBeVisible({timeout: T});
        await expect(reviewerPage.getByRole('button', {name: 'Begin Submission'})).toBeVisible({timeout: T});
        const reviewerRead = await readComponentsApi(reviewerPage, tag);
        expect(reviewerRead.status, 'the components address refuses the Reviewer').toBe(401);
        expect(reviewerRead.names).toEqual([]);

        // The Author who is also a Reviewer: "Action Required by me".
        const bothPage = await actorPage(asUser, users.authorReviewer);
        const bothAbout = await openSubmissionsPage(bothPage, tag);
        await bothAbout.noticeLink('view your pending submissions').click();
        await expect(listHeading(bothPage, /Action Required by me/)).toBeVisible({timeout: T});

        // Control: the Reader reads the same line, no "Edit", and the
        // components address refuses the Reader.
        const readerPage = await actorPage(asUser, users.reader);
        const readerAbout = await openSubmissionsPage(readerPage, tag);
        await expectNoticeLine(readerAbout, SIGNED_IN_LINE, ['Make a new submission', 'view your pending submissions']);
        await expectPartHeadings(readerAbout, PARTS);
        await expect(readerAbout.editLinks()).toHaveCount(0);
        const readerRead = await readComponentsApi(readerPage, tag);
        expect(readerRead.status, 'the components address refuses the Reader').toBe(401);
        expect(readerRead.names).toEqual([]);
    });

    test('S3: author guidance on the "Submissions" page and in the wizard', async ({asUser, browser, baseURL, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s3', testInfo);
        const manager = `${tag}mgr`;
        const author = `${tag}au`;
        await ompApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
            ],
        });
        const {submissionId} = await ompApi.createSubmission({tag: `${tag}d`, context: tag, submitter: author, submitted: false});

        // The visitor, signed out, on the "Submissions" page.
        const visitorPage = await signedOutPage(browser, baseURL);
        const visitor = await openSubmissionsPage(visitorPage, tag);
        await expect(visitor.part('Author Guidelines')).toHaveCount(1);

        // The Author's draft, open at "Upload Files" before any change.
        const authorPage = await actorPage(asUser, author);
        await openDraft(authorPage, tag, submissionId);
        await expect(authorPage.getByText(UPLOAD_DEFAULT_OPENING)).toBeVisible({timeout: T});

        // "Workflow Settings" from the side menu.
        const page = await actorPage(asUser, manager);
        await page.goto(`/index.php/${tag}/submissions`);
        const workflow = new WorkflowSubmissionSettings(page, tag, {listTitle: 'Monograph Components'});
        await workflow.openFromSideMenu();
        await expect(workflow.submissionTab).toHaveAttribute('aria-selected', 'true');
        await expect(workflow.sideTab('Disable Submissions')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await expect(workflow.sideTabs()).toHaveText(SIDE_TABS);

        // "Author Guidance": the default guidelines, an empty copyright
        // notice (found by its editor, OMP1), a "For Reviewer Suggestion" box.
        await workflow.openSideTab('Author Guidance');
        const guidance = workflow.guidance;
        expect(await guidance.text('Author Guidelines')).toMatch(new RegExp(`^${GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        expect(await guidance.text('Copyright Notice')).toBe('');
        await expect(guidance.label('For Reviewer Suggestion')).toHaveCount(1);
        await expect(guidance.label('For the Editors')).toHaveCount(1);

        // A reload keeps "Author Guidance".
        await workflow.reload();
        await expect(workflow.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await guidance.ready();

        // Typed, not saved: kept across side tabs; the visitor still reads
        // the default; a reload asks nothing and drops it.
        await guidance.type('Author Guidelines', 'Unsaved guidance');
        await workflow.openSideTab('Metadata');
        await workflow.openSideTab('Author Guidance');
        expect(await guidance.text('Author Guidelines')).toBe('Unsaved guidance');
        await visitor.reload();
        expect(await visitor.partText('Author Guidelines')).toMatch(new RegExp(`^${GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        const asked = [];
        page.on('dialog', (d) => {
            asked.push(`${d.type()}: ${d.message()}`);
            d.accept().catch(() => {});
        });
        await workflow.heading.click();
        await workflow.reload();
        await expect(workflow.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await guidance.ready();
        expect(await guidance.text('Author Guidelines')).toMatch(new RegExp(`^${GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        expect(asked, 'nothing asks before the reload').toEqual([]);

        // Texts saved: "Saving", then "Saved", and no notice on the page.
        await guidance.type('Author Guidelines', 'Send your manuscript as a Word file');
        await guidance.type('Before you begin', 'Read the guidelines first');
        await guidance.type('Submission Checklist', 'The manuscript is anonymised');
        await guidance.type('Upload Files', 'Upload the manuscript and its figures');
        await guidance.type('Copyright Notice', 'Authors keep the copyright of their work');
        await markNotices(page);
        const {statuses} = await saveWatchingStatus(page, guidance);
        expect(statuses).toContain('Saving');
        expect(statuses[statuses.length - 1]).toBe('Saved');
        expect(statuses.indexOf('Saving')).toBeLessThan(statuses.lastIndexOf('Saved'));
        await expect(notices(page, undefined, {fresh: true})).toHaveCount(0);

        // The visitor's page: the new texts, and the copyright notice
        // between the checklist and the privacy statement.
        await visitor.reload();
        await expectPartHeadings(visitor, ['Author Guidelines', 'Submission Preparation Checklist', 'Copyright Notice', 'Privacy Statement']);
        expect(await visitor.partText('Author Guidelines')).toBe('Send your manuscript as a Word file');
        expect(await visitor.partText('Submission Preparation Checklist')).toBe('The manuscript is anonymised');
        expect(await visitor.partText('Copyright Notice')).toBe('Authors keep the copyright of their work');

        // The Author's open draft keeps the earlier text until reloaded.
        await expect(authorPage.getByText(UPLOAD_DEFAULT_OPENING)).toBeVisible();
        await expect(authorPage.getByText('Upload the manuscript and its figures')).toHaveCount(0);
        await authorPage.reload();
        await expectWizardOpen(authorPage);
        await expectStep(authorPage, STEPS.files);
        await expect(authorPage.getByText('Upload the manuscript and its figures')).toBeVisible({timeout: T});
        await expect(authorPage.getByText(UPLOAD_DEFAULT_OPENING)).toHaveCount(0);

        // The Author's start screen: the new "Before you begin" and checklist.
        const authorAbout = await openSubmissionsPage(authorPage, tag);
        await authorAbout.noticeLink('Make a new submission').click();
        await expect(authorPage.getByRole('heading', {name: /Make a Submission/}).first()).toBeVisible({timeout: T});
        await expect(authorPage.getByText('Read the guidelines first')).toBeVisible({timeout: T});
        await expect(authorPage.getByText('The manuscript is anonymised')).toBeVisible({timeout: T});

        // "Author Guidelines" emptied: the part leaves the visitor's page.
        await guidance.type('Author Guidelines', '');
        await guidance.save();
        await visitor.reload();
        await expect(visitor.part('Author Guidelines')).toHaveCount(0);
        await expect(visitor.partHeadings().first()).toHaveText(/^\s*Submission Preparation Checklist(\s|$)/);

        // "Privacy Statement" emptied on Settings › Website › "Setup".
        const website = new SettingsPages(page, tag);
        const privacy = await website.openWebsiteSetupTab('privacy');
        await privacy.typeRich('privacy-privacyStatement-control', '');
        await privacy.save();
        await visitor.reload();
        await expect(visitor.part('Privacy Statement')).toHaveCount(0);

        // Control: the parts whose texts are set still stand.
        await expectPartHeadings(visitor, ['Submission Preparation Checklist', 'Copyright Notice']);
        expect(await visitor.partText('Copyright Notice')).toBe('Authors keep the copyright of their work');
        await visitorPage.context().close();
    });

    test('S4: not accepting submissions', async ({asUser, browser, baseURL, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const manager = `${tag}mgr`;
        const author = `${tag}au`;
        await ompApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
            ],
            plugins: {makesubmissionblockplugin: {enabled: true}},
            sidebar: ['makesubmissionblockplugin'],
        });
        const PARTS = ['Author Guidelines', 'Submission Preparation Checklist', 'Privacy Statement'];

        // Accepting: the visitor's and the Author's lines.
        const visitorPage = await signedOutPage(browser, baseURL);
        const visitor = await openSubmissionsPage(visitorPage, tag);
        await expectNoticeLine(visitor, LOGIN_LINE, ['Login', 'Register']);
        const authorPage = await actorPage(asUser, author);
        const authorAbout = await openSubmissionsPage(authorPage, tag);
        await expectNoticeLine(authorAbout, SIGNED_IN_LINE, ['Make a new submission', 'view your pending submissions']);

        // "Disable Submissions": a heading and an unticked box; ticked and saved.
        const page = await actorPage(asUser, manager);
        const workflow = new WorkflowSubmissionSettings(page, tag, {listTitle: 'Monograph Components'});
        await workflow.goto();
        await expect(workflow.sideTab('Disable Submissions')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await workflow.disableForm.ready();
        await expect(workflow.disableHeading()).toBeVisible();
        await expect(workflow.disableBox()).not.toBeChecked();
        await workflow.disableBox().check();
        const disabled = await saveWatchingStatus(page, workflow.disableForm);
        expect(disabled.statuses).toContain('Saving');
        expect(disabled.statuses[disabled.statuses.length - 1]).toBe('Saved');

        // The visitor's page: the not-accepting sentence, no link; the
        // parts still shown under it (the scenario's control).
        await visitor.reload();
        await expectNoticeLine(visitor, NOT_ACCEPTING, []);
        await expectPartHeadings(visitor, PARTS);

        // The Author's page: the same.
        await authorAbout.reload();
        await expectNoticeLine(authorAbout, NOT_ACCEPTING, []);

        // The Press Manager's page, from the header's "About" menu: the same.
        const mgrAbout = new AboutSubmissionsPage(page, tag);
        await mgrAbout.gotoHome();
        await mgrAbout.openFromMenu();
        await expectNoticeLine(mgrAbout, NOT_ACCEPTING, []);

        // The block: its link opens the "Submissions" page, same sentence.
        await visitor.gotoHome();
        const blockLink = visitorPage.locator('.block_make_submission a');
        await expect(blockLink).toHaveCount(1, {timeout: T});
        await blockLink.click();
        await expect(visitor.pageHeading()).toBeVisible({timeout: T});
        await expect(visitorPage).toHaveURL(new RegExp(`/index\\.php/${tag}/about/submissions$`));
        await expectNoticeLine(visitor, NOT_ACCEPTING, []);
        await expectPartHeadings(visitor, PARTS);

        // Accepting again: unticked and saved; both lines come back.
        await workflow.goto();
        await workflow.disableForm.ready();
        await expect(workflow.disableBox()).toBeChecked();
        await workflow.disableBox().uncheck();
        await workflow.disableForm.save();
        await visitor.reload();
        await expectNoticeLine(visitor, LOGIN_LINE, ['Login', 'Register']);
        await authorAbout.reload();
        await expectNoticeLine(authorAbout, SIGNED_IN_LINE, ['Make a new submission', 'view your pending submissions']);
        await visitorPage.context().close();
    });

    test('S5: the "Metadata" tab', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const manager = `${tag}mgr`;
        await ompApi.createContext({tag, users: [{username: manager, roles: ['manager']}]});
        const page = await actorPage(asUser, manager);
        const workflow = new WorkflowSubmissionSettings(page, tag, {listTitle: 'Monograph Components'});
        const md = workflow.metadata;

        // The tab at the install's settings.
        await workflow.goto('Metadata');
        await expect(md.box(KEYWORDS_BOX)).toBeChecked();
        await expect(md.choice(KEYWORDS_BOX, KEYWORDS_ASK)).toBeChecked();
        await expect(md.choices(KEYWORDS_BOX)).toHaveCount(3);
        await expect(md.box(SUBJECTS_BOX)).not.toBeChecked();
        await expect(md.choices(SUBJECTS_BOX)).toHaveCount(0);
        await expect(md.box(TYPE_BOX)).toBeChecked();
        await expect(md.choice(TYPE_BOX, TYPE_NONE)).toBeChecked();

        // An item ticked: three choices, "Do not request …".
        await md.box(SUBJECTS_BOX).check();
        await expect(md.choices(SUBJECTS_BOX)).toHaveCount(3);
        await expect(md.choiceStartingWith(SUBJECTS_BOX, 'Do not request')).toBeChecked();

        // Unticked and ticked again: back at "Do not request …".
        await md.choice(KEYWORDS_BOX, KEYWORDS_REQUIRE).check();
        await expect(md.choice(KEYWORDS_BOX, KEYWORDS_REQUIRE)).toBeChecked();
        await md.box(KEYWORDS_BOX).uncheck();
        await expect(md.choices(KEYWORDS_BOX)).toHaveCount(0);
        await expect(md.choices(SUBJECTS_BOX)).toHaveCount(3);
        await md.box(KEYWORDS_BOX).check();
        await expect(md.choices(KEYWORDS_BOX)).toHaveCount(3);
        await expect(md.choice(KEYWORDS_BOX, KEYWORDS_NONE)).toBeChecked();

        // Saved: "Saving", then "Saved".
        await md.choice(KEYWORDS_BOX, KEYWORDS_REQUIRE).check();
        const {statuses} = await saveWatchingStatus(page, md);
        expect(statuses).toContain('Saving');
        expect(statuses[statuses.length - 1]).toBe('Saved');

        // After a reload: "Metadata" still open, the saved boxes and choices.
        await workflow.reload();
        await expect(workflow.sideTab('Metadata')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await md.ready();
        await expect(md.box(SUBJECTS_BOX)).toBeChecked();
        await expect(md.choiceStartingWith(SUBJECTS_BOX, 'Do not request')).toBeChecked();
        await expect(md.box(KEYWORDS_BOX)).toBeChecked();
        await expect(md.choice(KEYWORDS_BOX, KEYWORDS_REQUIRE)).toBeChecked();

        // Control: "Enable coverage metadata", never touched, still unticked.
        await expect(md.box(COVERAGE_BOX)).not.toBeChecked();

        // Boxes that depend on another.
        await expect(md.box(LOOKUP_BOX)).toBeVisible();
        await md.box(REFERENCES_BOX).uncheck();
        await expect(md.box(LOOKUP_BOX)).toHaveCount(0);
        await expect(md.box(REFERENCES_BOX)).toBeVisible();
        await md.box(REFERENCES_BOX).check();
        await expect(md.box(LOOKUP_BOX)).toBeVisible();
        await expect(md.box(GRANT_BOX)).toBeVisible();
        await md.box(FUNDERS_BOX).uncheck();
        await expect(md.box(GRANT_BOX)).toHaveCount(0);
        await expect(md.box(FUNDERS_BOX)).toBeVisible();
        await md.box(FUNDERS_BOX).check();
        await expect(md.box(GRANT_BOX)).toBeVisible();
    });

    test('S6: add and edit a component', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const manager = `${tag}mgr`;
        await ompApi.createContext({tag, users: [{username: manager, roles: ['manager']}]});
        const page = await actorPage(asUser, manager);
        const workflow = new WorkflowSubmissionSettings(page, tag, {listTitle: 'Monograph Components'});
        const list = workflow.components;

        // The list: "Monograph Components", its three buttons, fifteen rows.
        await workflow.goto('Components');
        await expect(list.heading()).toBeVisible();
        await expect(list.headerLinks()).toHaveText(['Order', 'Add a Component', 'Restore Defaults']);
        await expect.poll(() => list.names(), {timeout: T}).toEqual(PRESS_COMPONENTS);

        // "Add a Component": the empty window.
        let win = await list.openAdd();
        await expect(win.heading()).toHaveText(/^\s*Add a Component\s*$/);
        await expect(win.nameBox()).toHaveValue('');
        await expect(win.dependentBox()).not.toBeChecked();
        await expect(win.supplementaryBox()).not.toBeChecked();
        await expect(win.metadataChoice()).toHaveText(/^\s*Document\s*$/);
        await expect(win.requiredChoice(REQUIRE_NO)).toBeChecked();
        await expect(win.requiredChoice(REQUIRE_YES)).not.toBeChecked();
        await expect(win.requiredNote()).toContainText('Required fields are marked with an asterisk: *');
        await expect(win.cancelLink()).toBeVisible();
        await expect(win.saveButton()).toBeVisible();

        // An empty "Name": refused under the box, the window stays.
        const sent = await win.saveRefusedInPlace(win.nameError());
        await expect(win.nameError()).toHaveText(REQUIRED);
        expect(sent, 'the browser refuses the empty name before sending').toBe(0);
        await expect(win.form()).toBeVisible();

        // A malformed "Key": a notice at the window's top right; closed with "×".
        await win.typeName('Survey Forms');
        await win.typeKey('-survey');
        await markNotices(page);
        await win.save();
        const malformed = notices(page, KEY_MALFORMED, {fresh: true}).first();
        await expect(malformed).toBeVisible({timeout: T});
        await expect(win.form()).toBeVisible();
        // The notice's "×" lies under the window and cannot be pressed
        // (T-omp-1): the notice is waited out instead.
        await expect(malformed).toBeHidden({timeout: T});

        // Added: the list gains "Survey Forms".
        await win.typeKey('SURVEY');
        await win.saveAndClose();
        await expect(list.row('Survey Forms')).toHaveCount(1, {timeout: T});

        // A taken "Key": refused; then saved under another key.
        win = await list.openAdd();
        await win.typeName('Survey Data');
        await win.typeKey('SURVEY');
        await markNotices(page);
        await win.save();
        await expect(notices(page, KEY_TAKEN, {fresh: true}).first()).toBeVisible({timeout: T});
        await expect(win.form()).toBeVisible();
        await win.typeKey('SURVEY-DATA');
        await win.saveAndClose();
        await expect(list.row('Survey Data')).toHaveCount(1, {timeout: T});

        // Edited: the window filled with the saved values; "Save" closes it
        // with no notice, the row renamed.
        win = await list.openEdit('Survey Forms');
        await expect(win.heading()).toHaveText(/^\s*Edit\s*$/);
        await expect(win.nameBox()).toHaveValue('Survey Forms');
        await expect(win.keyBox()).toHaveValue('SURVEY');
        await win.typeName('Survey Instruments');
        await markNotices(page);
        await win.saveAndClose();
        await expect(list.row('Survey Instruments')).toHaveCount(1, {timeout: T});
        await expect(list.row('Survey Forms')).toHaveCount(0);
        await expect(notices(page, undefined, {fresh: true})).toHaveCount(0);

        // An install component: its key shown, not editable; required.
        win = await list.openEdit('Book Manuscript');
        await expect(win.keyBox()).not.toHaveValue('');
        await expect(win.keyBox()).not.toBeEditable();
        await expect(win.requiredChoice(REQUIRE_YES)).toBeChecked();

        // "Cancel" after a change: closes without asking, nothing kept.
        await win.typeName('Main Text');
        const asked = await win.cancel();
        expect(asked).toEqual([]);
        await expect(list.row('Book Manuscript')).toHaveCount(1, {timeout: T});
        await expect(list.row('Main Text')).toHaveCount(0);

        // "Close" after a change: the browser asks.
        win = await list.openEdit('Survey Instruments');
        await win.typeName('Surveys');
        await win.nameBox().blur();
        expect(await closeAskedAccepted(page, win)).toBe(FORM_CHANGED);

        // Control: the second browser's list.
        const second = await actorPage(asUser, manager);
        const secondWorkflow = new WorkflowSubmissionSettings(second, tag, {listTitle: 'Monograph Components'});
        await secondWorkflow.goto('Components');
        const secondList = secondWorkflow.components;
        await expect(secondList.row('Survey Instruments')).toHaveCount(1, {timeout: T});
        await expect(secondList.row('Survey Data')).toHaveCount(1);
        await expect(secondList.row('Survey Forms')).toHaveCount(0);
        await expect(secondList.row('Main Text')).toHaveCount(0);
        await expect(secondList.row('Book Manuscript')).toHaveCount(1);
    });

    test('S7: delete a component, restore the defaults and order the list', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const manager = `${tag}mgr`;
        const author = `${tag}au`;
        await ompApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
            ],
            components: {'Field Notes': {metadata: 'document'}},
        });
        await ompApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            files: [{file: 'article.pdf', genre: 'Index'}],
        });
        const {submissionId: draftId} = await ompApi.createSubmission({tag: `${tag}d`, context: tag, submitter: author, submitted: false});

        // The Author's draft, open at "Upload Files".
        const authorPage = await actorPage(asUser, author);
        await openDraft(authorPage, tag, draftId);

        const page = await actorPage(asUser, manager);
        const workflow = new WorkflowSubmissionSettings(page, tag, {listTitle: 'Monograph Components'});
        const list = workflow.components;
        await workflow.goto('Components');
        await expect(list.row('Field Notes')).toHaveCount(1, {timeout: T});

        // A delete refused: the question, "OK", the browser pop-up, "Cancel".
        let del = await list.openDelete('Index');
        await expect(del.question()).toContainText(DELETE_QUESTION);
        await expect(del.button('OK')).toBeVisible();
        await expect(del.button('Cancel')).toBeVisible();
        expect(await list.confirmDeleteRefused(del)).toBe(DELETE_REFUSED);
        await del.answer('Cancel');
        await pastCloseWindow(page);
        await expect(list.row('Index')).toHaveCount(1, {timeout: T});

        // Deleted: "Prospectus" leaves the list.
        del = await list.openDelete('Prospectus');
        await list.confirmDelete(del);
        await expect(list.row('Prospectus')).toHaveCount(0, {timeout: T});
        await expect(list.row('Preface')).toHaveCount(1);

        // The Author's upload: "Prospectus" is not offered ("Preface" is).
        await authorPage.reload();
        await expectWizardOpen(authorPage);
        await expectStep(authorPage, STEPS.files);
        const choice = await uploadAndOpenComponentChoice(authorPage);
        await expect(choice.getByRole('radio', {name: 'Preface', exact: true})).toBeVisible({timeout: T});
        await expect(choice.getByRole('radio', {name: 'Prospectus', exact: true})).toHaveCount(0);

        // An install component renamed.
        const win = await list.openEdit('Other');
        await win.typeName('Other Files');
        await win.saveAndClose();
        await expect(list.row('Other Files')).toHaveCount(1, {timeout: T});
        await expect(list.row('Other')).toHaveCount(0);

        // "Restore Defaults": asked, confirmed; the install list is back, the
        // added component kept.
        const restore = await list.openRestore();
        await expect(restore.question()).toContainText(RESTORE_QUESTION);
        await list.confirmRestore(restore);
        await expect(list.row('Prospectus')).toHaveCount(1, {timeout: T});
        await expect(list.row('Other')).toHaveCount(1);
        await expect(list.row('Other Files')).toHaveCount(0);
        await expect(list.row('Field Notes')).toHaveCount(1);
        await expect
            .poll(async () => {
                const names = await list.names();
                const at = names.indexOf('Prospectus');
                return [names[at - 1], names[at + 1]];
            }, {timeout: T})
            .toEqual(['Preface', 'Table']);
        const before = await list.names();
        expect(before[before.length - 1]).toBe('Other');

        // Ordering cancelled: the rows are back as they were.
        await list.startOrdering();
        await expect(list.dragHandles().first()).toBeVisible();
        await dragInView(list, 'Other', before[0]);
        await expect.poll(async () => (await list.names())[0], {timeout: T}).toBe('Other');
        await list.cancelOrdering();
        await expect.poll(() => list.names(), {timeout: T}).toEqual(before);

        // Ordering done: "Other" first, also after a reload.
        await list.startOrdering();
        await dragInView(list, 'Other', before[0]);
        await expect.poll(async () => (await list.names())[0], {timeout: T}).toBe('Other');
        await list.done();
        await expect.poll(async () => (await list.names())[0], {timeout: T}).toBe('Other');
        await workflow.reload();
        await expect(workflow.sideTab('Components')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await list.waitLoaded();
        await expect.poll(async () => (await list.names())[0], {timeout: T}).toBe('Other');

        // Control: "Index", whose delete was refused, is still listed.
        await expect(list.row('Index')).toHaveCount(1);
    });
});
