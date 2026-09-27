// @ts-check
/**
 * @file playwright/tests/U58-submission-intake-configuration.spec.js
 *
 * Submission intake configuration — OPS suite, one test per canonical
 * scenario, in the preprint server's own words ("Preprints", "Preprint
 * Text", "Preprint Components", "For Readers", "This server …"): the
 * common scenarios 1–7. The per-app bullets a scenario badges {OJS OMP}
 * (scenario 2's Reviewer and Author-and-Reviewer, scenario 4's "Make a
 * Submission" block) have no surface on a preprint server and are not
 * run; a preprint server has no reviewer role and no such block plugin.
 * Spec: docs/specs/U58-submission-intake-configuration.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 ❓: S6 and S7 never read where an added component stands.
 * - A2 🐞: no test opens the "Media" page after a delete.
 * - A3 ❓: no test reuses a deleted component's key.
 * - A5 ❓: S2's Reader does not press "view your pending submissions".
 * - A8 🐞, A10 🐞: the "Key" help is not read; no name of only spaces.
 * - A9 🐞: no French interface.
 * - A11 ❓: the default texts' links are not followed.
 * - A12 🐞: S7 presses "Cancel" after the refused delete; the window's
 *   state in between is not read.
 * - OPS1 ✅, OPS2 ✅: S3 asserts them as the scenario states.
 * - A4, A6, A7, OJS1, OMP1, OMP2, OMP3: no scenario step here, or another
 *   app's surface.
 *
 * Seeding: scenario endpoints only (footnote s). S1 reads the seeded
 * server `publicknowledge` signed out and changes nothing; S2–S7 each seed
 * a scratch server with throwaway accounts (`users[]`), S7 also an added
 * component ("Field Notes", the context's `components` key) and a
 * submission whose galley carries "Data Set" (`galleys[].genre`); S3 and
 * S7 seed the Author's draft (`submitted: false`), which opens on
 * "1 Upload Files". Every setting a scenario changes is changed on the
 * tabs themselves, the feature under test. On a preprint server opening
 * the start screen makes a user an Author (seed-facts), so only Authors
 * press "Make a new submission" here. Signed-out reads run in a browser
 * context with an empty storage state (patterns.md, parallel lesson 8);
 * every actor has its own `asUser` context and the file sets no default
 * user. Nothing site-wide changes, so the suite runs in the parallel `ops`
 * project.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {
    WorkflowSubmissionSettings,
    AboutSubmissionsPage,
    saveWatchingStatus,
    pageNotices,
} = require('../../../../shared/playwright/pages/SubmissionIntakePages.js');
const {SettingsPages, ACCESS_DENIED} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');
const {markNotices, notices, pastCloseWindow, whole} = require('../../../../shared/playwright/pages/SectionsPages.js');
const {wizardUrl, expectStep, STEPS} = require('../pages/SubmissionWizardPages.js');

const SERVER = 'publicknowledge';
const T = 30_000;
const PREPRINT_PDF = path.join(__dirname, '..', 'fixtures', 'files', 'preprint.pdf');

const LIST_TITLE = 'Preprint Components';
const MAIN_COMPONENT = 'Preprint Text';
const SECTION = 'Preprints';
const INSTALL_COMPONENTS = [
    'Preprint Text',
    'Research Instrument',
    'Research Materials',
    'Research Results',
    'Transcripts',
    'Data Analysis',
    'Data Set',
    'Source Texts',
    'Multimedia',
    'Image',
    'HTML Stylesheet',
    'Other',
];

const SIGNED_OUT_LINE = 'Login or Register to make a submission.';
const SIGNED_IN_LINE = 'Make a new submission or view your pending submissions.';
const NOT_ACCEPTING = 'This server is not accepting submissions at this time.';
const DEFAULT_GUIDELINES_OPENING = 'Researchers are invited to submit a preprint to be posted on this server.';
const DEFAULT_CHECKLIST_OPENING = 'All submissions must meet the following requirements.';
const DEFAULT_UPLOAD_HELP_OPENING = 'Upload the preprint you would like to share.';
const SECTION_DEFAULT_POLICY = 'Section default policy';

const SIDE_TAB_NAMES = ['Disable Submissions', 'Author Guidance', 'Metadata', 'Components', 'Contributor Roles'];

const KEY_REFUSED =
    'The key can contain only alphanumeric characters, underscores, and hyphens, and must begin and end with an alphanumeric character.';
const KEY_TAKEN = 'The key already exists.';
const REQUIRED = 'This field is required.';
const FORM_CHANGED = 'The data on this form has changed. Do you wish to continue without saving?';
const DELETE_QUESTION = 'Are you sure you wish to delete this item? This action cannot be undone.';
const DELETE_REFUSED =
    'Before this component can be deleted, you must associate all related submission files with a different component.';
const RESTORE_QUESTION = 'Are you sure you wish to restore the defaults?';
const REQUIRE_YES = 'Yes, require submitting authors to upload one or more of these files.';
const REQUIRE_NO = 'No, allow new submissions without these files.';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u58${scenario}o${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for a scratch server (users.md: `<username>@mail.test`). */
function account(tag, suffix, givenName, familyName, roles) {
    return {username: `${tag}${suffix}`, givenName, familyName, email: `${tag}${suffix}@mail.test`, roles};
}

/** A signed-out browser page (no inherited storage state). */
async function signedOutPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'});
    return context.newPage();
}

/** A page of an account's own authenticated context. */
async function pageAs(asUser, username) {
    return (await asUser(username)).newPage();
}

/** Open a backend landing page and wait for the side menu. */
async function openBackend(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/submissions`);
    await expect(page.getByRole('navigation', {name: 'Site Navigation'})).toBeVisible({timeout: T});
}

/** The notice line's sentence, read as the page renders it. */
async function expectLine(subs, sentence) {
    await expect(subs.notice()).toHaveText(sentence, {useInnerText: true, timeout: T});
}

/** The parts' headings, in page order, with any "Edit" words left out. */
async function partHeadingNames(subs) {
    await expect(subs.partHeadings().first()).toBeVisible({timeout: T});
    return subs.partHeadings().evaluateAll((hs) =>
        hs.map((h) => {
            const copy = /** @type {HTMLElement} */ (h.cloneNode(true));
            copy.querySelectorAll('a').forEach((a) => a.remove());
            return (copy.textContent || '').replace(/\s+/g, ' ').trim();
        })
    );
}

/**
 * The typed components address of the programming interface (footnote s),
 * read as the browser gets it: the answer's status, the listed names and
 * the refusal's message.
 */
async function readComponentsAddress(page, contextPath) {
    const response = await page.goto(`/index.php/${contextPath}/api/v1/genres`);
    expect(response, 'the components address answers').not.toBeNull();
    const body = await /** @type {import('@playwright/test').Response} */ (response).text();
    let json = null;
    try {
        json = JSON.parse(body);
    } catch (e) {
        json = null;
    }
    const names = json && Array.isArray(json.items)
        ? json.items.map((g) => (g.name && typeof g.name === 'object' ? g.name.en || Object.values(g.name)[0] : g.name))
        : null;
    return {
        ok: /** @type {import('@playwright/test').Response} */ (response).ok(),
        names,
        errorMessage: json && json.errorMessage,
    };
}

/**
 * The Upload Files step's "Add File" on a preprint server (the legacy
 * galley grid, screen-notes ccK1): the galley label window's "Save", then
 * the upload wizard. Returns the upload window and its component list.
 */
async function openGalleyUpload(page, label) {
    const labelDialog = page.getByRole('dialog').filter({has: page.locator('#preprintGalleyForm')});
    await waitForJQueryIdle(page);
    for (let attempt = 0; ; attempt++) {
        await page.getByRole('link', {name: 'Add File', exact: true}).click();
        try {
            await expect(labelDialog.first()).toBeVisible({timeout: 5_000});
            break;
        } catch (error) {
            if (attempt >= 2) throw error;
        }
    }
    await labelDialog.locator('input[name="label"]').fill(label);
    await labelDialog.getByRole('button', {name: 'Save', exact: true}).click();
    const upload = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
    const genreSelect = upload.locator('select[name="genreId"]').first();
    await expect(genreSelect).toBeVisible({timeout: T});
    return {upload, genreSelect};
}

/** The components an upload's list offers, by name (the empty prompt left out). */
async function offeredComponents(genreSelect) {
    await expect(genreSelect.locator('option').nth(1)).toBeAttached({timeout: T});
    return (await genreSelect.locator('option').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
}

/** Finish the upload wizard with a component and the preprint fixture. */
async function completeGalleyUpload(page, upload, genreSelect, component, label) {
    await genreSelect.selectOption({label: component});
    await upload.locator('input[type="file"]').setInputFiles(PREPRINT_PDF);
    const continueButton = upload.getByRole('button', {name: 'Continue', exact: true});
    await expect(continueButton).toBeEnabled({timeout: T});
    await continueButton.click();
    await expect(upload.getByRole('tab', {name: '2. Review Details'})).toHaveAttribute('aria-selected', 'true', {timeout: T});
    await upload.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(upload.getByRole('tab', {name: '3. Confirm'})).toHaveAttribute('aria-selected', 'true', {timeout: T});
    await upload.getByRole('button', {name: 'Complete', exact: true}).click();
    await expect(upload).toHaveCount(0, {timeout: T});
    await waitForJQueryIdle(page);
    await expect(page.locator('.submissionWizard').getByRole('link', {name: label}).first()).toBeVisible({timeout: T});
}

/**
 * The component window's "Close" after a change: the browser question it
 * asks, answered "OK" inside the dialog handler (a click awaited while a
 * `confirm()` blocks the page never returns, so the page object's
 * `closeAsked`, which awaits the click first, hangs here).
 */
async function closeWindowAsked(page, win) {
    /** @type {string|null} */
    let message = null;
    page.once('dialog', (d) => {
        message = d.message();
        d.accept().catch(() => {});
    });
    await win.closeButton().click();
    await expect.poll(() => message, {timeout: T}).not.toBeNull();
    await expect(win.form()).toHaveCount(0, {timeout: T});
    await pastCloseWindow(page);
    return message;
}

/** "Save" on a settings form: "Saving" and then "Saved", with no page notice (Rule 2). */
async function saveShowingStatus(page, form) {
    const {response, statuses} = await saveWatchingStatus(page, form);
    expect(response.status(), 'the settings save answers 200').toBe(200);
    expect(statuses, '"Saving" and then "Saved" beside the button').toEqual(expect.arrayContaining(['Saving', 'Saved']));
    expect(statuses.indexOf('Saving')).toBeLessThan(statuses.lastIndexOf('Saved'));
    await expect(form.savedStatus).toBeVisible();
    await expect(pageNotices(page)).toHaveCount(0);
}

test.describe('submission intake configuration (U58) — OPS', () => {
    test('S1: a visitor reads the "Submissions" page', {tag: '@smoke'}, async ({browser, baseURL}) => {
        const visitor = await signedOutPage(browser, baseURL);
        const subs = new AboutSubmissionsPage(visitor, SERVER, {locale: 'en'});

        // The page, from the header's "About" menu (Fields; Rules 22, 23a).
        await subs.gotoHome();
        await subs.openFromMenu();
        expect(await subs.breadcrumbTrail()).toEqual(['Home', 'Submissions']);
        await expect(subs.pageHeading()).toHaveText(whole('Submissions'));
        await expectLine(subs, SIGNED_OUT_LINE);

        // The parts, in order (Fields; Rule 24).
        expect(await partHeadingNames(subs)).toEqual([
            'Author Guidelines',
            'Submission Preparation Checklist',
            SECTION,
            'Privacy Statement',
        ]);
        expect(await subs.partText('Author Guidelines')).toMatch(new RegExp(`^${DEFAULT_GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        expect(await subs.partText('Submission Preparation Checklist')).toMatch(
            new RegExp(`^${DEFAULT_CHECKLIST_OPENING.replace(/\./g, '\\.')}`)
        );
        expect(await subs.partText(SECTION)).toBe(SECTION_DEFAULT_POLICY);
        await expect(subs.part('Privacy Statement')).toHaveCount(1);

        // Control: no "Copyright Notice" part and no "Edit" link, read on the
        // page whose four parts were just listed (Actors row 7; Rules 24, 25).
        await expect(subs.part('Copyright Notice')).toHaveCount(0);
        await expect(subs.editLinks()).toHaveCount(0);

        // "Login" opens the Login page (Rule 23a).
        await subs.noticeLink('Login').click();
        await visitor.waitForURL(/\/login(\?|$)/, {waitUntil: 'commit'});
        await expect(visitor.locator('form#login')).toBeVisible({timeout: T});
        await visitor.goBack();
        await expect(subs.pageHeading()).toBeVisible({timeout: T});

        // "Register" opens the server's Register page (Rule 23a).
        await subs.noticeLink('Register').click();
        await visitor.waitForURL(new RegExp(`/${SERVER}/(en/)?user/register`), {waitUntil: 'commit'});
        await expect(visitor.locator('.pkp_structure_main h1')).toHaveText(whole('Register'), {timeout: T});
    });

    test('S2: each role\'s links on the "Submissions" page', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s2', testInfo);
        const users = {
            manager: account(tag, 'mg', 'Mia', 'Manager', ['manager']),
            moderator: account(tag, 'se', 'Sam', 'Moderator', ['sectionEditor']),
            assistant: account(tag, 'as', 'Abe', 'Board', ['editorialBoardMember']),
            author: account(tag, 'au', 'Ada', 'Author', ['author']),
            reader: account(tag, 'rd', 'Rex', 'Reader', ['reader']),
        };
        await opsApi.createContext({tag, users: Object.values(users)});

        // The Journal Manager's page: the signed-in line, "Edit" beside the
        // three parts and not beside "Preprints" (Rules 23b, 25).
        const managerPage = await pageAs(asUser, users.manager.username);
        const manager = new AboutSubmissionsPage(managerPage, tag);
        await manager.gotoHome();
        await manager.openFromMenu();
        await expectLine(manager, SIGNED_IN_LINE);
        for (const part of ['Author Guidelines', 'Submission Preparation Checklist', 'Privacy Statement']) {
            await expect(manager.partEditLink(part), `"Edit" beside "${part}"`).toHaveCount(1);
        }
        await expect(manager.part(SECTION)).toHaveCount(1);
        await expect(manager.part(SECTION).locator('a.cmp_edit_link')).toHaveCount(0);
        await expect(manager.editLinks()).toHaveCount(3);

        // The Journal Manager's "Edit" links (Rule 25).
        const wf = new WorkflowSubmissionSettings(managerPage, tag, {listTitle: LIST_TITLE});
        for (const part of ['Author Guidelines', 'Submission Preparation Checklist']) {
            await manager.partEditLink(part).click();
            await wf.waitLoaded();
            await expect(wf.submissionTab).toHaveAttribute('aria-selected', 'true');
            await expect(wf.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
            await expect(wf.sidePanel('Author Guidance')).toBeVisible();
            // "Go back": the side tab writes its own history entry
            // (`#submission/instructions` → `#instructions`), so one Back
            // stays on the Settings page; the page is reopened instead.
            await manager.open();
        }
        const website = new SettingsPages(managerPage, tag);
        await manager.partEditLink('Privacy Statement').click();
        await managerPage.waitForURL(/\/management\/settings\/website/, {waitUntil: 'commit'});
        await expect(website.heading).toHaveText(whole('Website Settings'), {timeout: T});
        await expect(website.tab('Setup')).toHaveAttribute('aria-selected', 'true');
        await expect(managerPage.getByRole('tab', {name: 'Privacy Statement', exact: true})).toHaveAttribute('aria-selected', 'true', {
            timeout: T,
        });
        await website.privacyForm().ready();

        // The Journal Manager's pending submissions: the Dashboard on
        // "Assigned to me" (Rule 23b).
        await manager.open();
        await manager.noticeLink('view your pending submissions').click();
        await managerPage.waitForURL(/\/dashboard\/editorial/, {waitUntil: 'commit'});
        await expect(managerPage.locator('main h1').first()).toHaveText(/^\s*Assigned to me\b/, {timeout: T});

        // The Moderator and the assistant: the same line, no "Edit", and
        // "view your pending submissions" opens "Assigned to me" (Actors row
        // 7; Rules 23b, 25). The control for the absent links is the four
        // parts the same page lists.
        for (const who of [users.moderator, users.assistant]) {
            const page = await pageAs(asUser, who.username);
            const subs = new AboutSubmissionsPage(page, tag);
            await subs.gotoHome();
            await subs.openFromMenu();
            await expectLine(subs, SIGNED_IN_LINE);
            expect(await partHeadingNames(subs)).toEqual([
                'Author Guidelines',
                'Submission Preparation Checklist',
                SECTION,
                'Privacy Statement',
            ]);
            await expect(subs.editLinks(), `no "Edit" for ${who.familyName}`).toHaveCount(0);
            await subs.noticeLink('view your pending submissions').click();
            await page.waitForURL(/\/dashboard\/editorial/, {waitUntil: 'commit'});
            await expect(page.locator('main h1').first()).toHaveText(/^\s*Assigned to me\b/, {timeout: T});
        }

        // The Author's page: the same line, no "Edit"; "view your pending
        // submissions" opens "My Submissions" on "Active submissions";
        // "Make a new submission" the start screen with "Begin Submission"
        // (Actors rows 6, 7; Rules 23b, 25).
        const authorPage = await pageAs(asUser, users.author.username);
        const author = new AboutSubmissionsPage(authorPage, tag);
        await author.gotoHome();
        await author.openFromMenu();
        await expectLine(author, SIGNED_IN_LINE);
        await expect(author.part('Author Guidelines')).toHaveCount(1);
        await expect(author.editLinks()).toHaveCount(0);
        await author.noticeLink('view your pending submissions').click();
        await authorPage.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit'});
        await expect(authorPage.locator('main h1').first()).toHaveText(/^\s*Active submissions\b/, {timeout: T});
        // "Go back" (the dashboard rewrites its address as it loads).
        await author.open();
        await author.noticeLink('Make a new submission').click();
        await authorPage.waitForURL(new RegExp(`/${tag}/submission(\\?|$)`), {waitUntil: 'commit'});
        await expect(authorPage.getByRole('heading', {name: 'Make a Submission', level: 1})).toBeVisible({timeout: T});
        await expect(authorPage.getByRole('button', {name: /Begin Submission/})).toBeVisible({timeout: T});

        // The Author reads the components at the typed address: the list,
        // "Preprint Text" among them (Actors row 8; Rule 28).
        const authorRead = await readComponentsAddress(authorPage, tag);
        expect(authorRead.ok, 'the Author is answered').toBe(true);
        expect(authorRead.names).toEqual(expect.arrayContaining([MAIN_COMPONENT]));

        // Control: the Reader's page reads the same line with no "Edit", and
        // the same address, typed the same way, refuses the Reader and lists
        // no component (Actors rows 7, 8; Rules 23b, 25, 28).
        const readerPage = await pageAs(asUser, users.reader.username);
        const reader = new AboutSubmissionsPage(readerPage, tag);
        await reader.gotoHome();
        await reader.openFromMenu();
        await expectLine(reader, SIGNED_IN_LINE);
        await expect(reader.part('Author Guidelines')).toHaveCount(1);
        await expect(reader.editLinks()).toHaveCount(0);
        const readerRead = await readComponentsAddress(readerPage, tag);
        expect(readerRead.ok, 'the Reader is refused').toBe(false);
        expect(readerRead.names, 'no component listed to the Reader').toBeNull();
        expect(readerRead.errorMessage).toBe(ACCESS_DENIED);
    });

    test('S3: author guidance on the "Submissions" page and in the wizard', async ({browser, baseURL, asUser, opsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s3', testInfo);
        const manager = account(tag, 'mg', 'Mia', 'Manager', ['manager']);
        const author = account(tag, 'au', 'Ada', 'Author', ['author']);
        await opsApi.createContext({tag, users: [manager, author]});
        const draft = await opsApi.createSubmission({tag: `${tag}d`, context: tag, submitter: author.username, submitted: false});

        // The visitor on the "Submissions" page, the Author on the draft's
        // "Upload Files" step.
        const visitorPage = await signedOutPage(browser, baseURL);
        const visitor = new AboutSubmissionsPage(visitorPage, tag);
        await visitor.open();
        const authorPage = await pageAs(asUser, author.username);
        await authorPage.goto(wizardUrl(tag, draft.submissionId));
        await expectStep(authorPage, STEPS.files);
        const authorMain = authorPage.getByRole('main');
        await expect(authorMain.getByText(DEFAULT_UPLOAD_HELP_OPENING)).toBeVisible({timeout: T});

        // "Workflow Settings" from the side menu: "Submission" › "Disable
        // Submissions", the five side tabs and no "Author Screening" (Fields;
        // Rules 1, 21; OPS2).
        const page = await pageAs(asUser, manager.username);
        const wf = new WorkflowSubmissionSettings(page, tag, {listTitle: LIST_TITLE});
        await openBackend(page, tag);
        await wf.openFromSideMenu();
        await expect(wf.submissionTab).toHaveAttribute('aria-selected', 'true');
        await expect(wf.sideTab('Disable Submissions')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await expect(wf.sideTabs()).toHaveText(SIDE_TAB_NAMES.map(whole));
        await expect(wf.sideTab('Author Screening')).toHaveCount(0);

        // "Author Guidance": the default guidelines, an empty "Copyright
        // Notice", "For Readers" and no "For the Editors" or "For Reviewer
        // Suggestion" (Fields; OPS1).
        await wf.openSideTab('Author Guidance');
        const guidance = wf.guidance;
        expect(await guidance.text('Author Guidelines')).toMatch(new RegExp(`^${DEFAULT_GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        expect(await guidance.text('Copyright Notice')).toBe('');
        await expect(guidance.label('For Readers')).toHaveCount(1);
        await expect(guidance.label('For the Editors')).toHaveCount(0);
        await expect(guidance.label('For Reviewer Suggestion')).toHaveCount(0);

        // A reload keeps "Author Guidance" open (Rule 1).
        await wf.reload();
        await expect(wf.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await guidance.ready();

        // Typed, not saved: kept across side tabs, never on the visitor's
        // page, gone after a reload that asks nothing (Rules 2, 7).
        await guidance.type('Author Guidelines', 'Unsaved guidance');
        await wf.openSideTab('Metadata');
        await wf.openSideTab('Author Guidance');
        expect(await guidance.text('Author Guidelines')).toBe('Unsaved guidance');
        await visitor.reload();
        expect(await visitor.partText('Author Guidelines')).toMatch(new RegExp(`^${DEFAULT_GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        const asked = [];
        const onDialog = (d) => {
            asked.push(d.type());
            d.accept().catch(() => {});
        };
        page.on('dialog', onDialog);
        await wf.reload();
        page.off('dialog', onDialog);
        expect(asked, 'the reload asks nothing').toEqual([]);
        await expect(wf.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await guidance.ready();
        expect(await guidance.text('Author Guidelines')).toMatch(new RegExp(`^${DEFAULT_GUIDELINES_OPENING.replace(/\./g, '\\.')}`));

        // Texts saved: "Saving", "Saved", no notice (Rule 2).
        await guidance.type('Author Guidelines', 'Send your manuscript as a Word file');
        await guidance.type('Before you begin', 'Read the guidelines first');
        await guidance.type('Submission Checklist', 'The manuscript is anonymised');
        await guidance.type('Upload Files', 'Upload the manuscript and its figures');
        await guidance.type('Copyright Notice', 'Authors keep the copyright of their work');
        await saveShowingStatus(page, guidance);

        // The visitor's page: the new texts, and "Copyright Notice" between
        // "Preprints" and "Privacy Statement" (Rules 7, 24).
        await visitor.reload();
        expect(await visitor.partText('Author Guidelines')).toBe('Send your manuscript as a Word file');
        expect(await visitor.partText('Submission Preparation Checklist')).toBe('The manuscript is anonymised');
        expect(await visitor.partText('Copyright Notice')).toBe('Authors keep the copyright of their work');
        expect(await partHeadingNames(visitor)).toEqual([
            'Author Guidelines',
            'Submission Preparation Checklist',
            SECTION,
            'Copyright Notice',
            'Privacy Statement',
        ]);

        // The Author's open draft keeps the text it loaded until reloaded
        // (Rule 7); the control is the default text still on it.
        await expect(authorMain.getByText(DEFAULT_UPLOAD_HELP_OPENING)).toBeVisible();
        await expect(authorMain.getByText('Upload the manuscript and its figures')).toHaveCount(0);
        await authorPage.reload();
        await expectStep(authorPage, STEPS.files);
        await expect(authorMain.getByText('Upload the manuscript and its figures')).toBeVisible({timeout: T});

        // The Author's start screen: "Before you begin" and the checklist
        // (Fields; Rule 7).
        const authorSubs = new AboutSubmissionsPage(authorPage, tag);
        await authorSubs.open();
        await authorSubs.noticeLink('Make a new submission').click();
        await authorPage.waitForURL(new RegExp(`/${tag}/submission(\\?|$)`), {waitUntil: 'commit'});
        await expect(authorPage.getByRole('heading', {name: 'Make a Submission', level: 1})).toBeVisible({timeout: T});
        await expect(authorMain.getByText('Read the guidelines first')).toBeVisible({timeout: T});
        await expect(authorMain.getByRole('group', {name: /Submission Checklist/}).getByText('The manuscript is anonymised')).toBeVisible();

        // "Edit" beside "Copyright Notice" opens "Author Guidance" (Rule 25).
        const managerSubs = new AboutSubmissionsPage(page, tag);
        await managerSubs.open();
        await managerSubs.partEditLink('Copyright Notice').click();
        await wf.waitLoaded();
        await expect(wf.submissionTab).toHaveAttribute('aria-selected', 'true');
        await expect(wf.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await guidance.ready();

        // "Author Guidelines" emptied: the part leaves the page (Rules 8, 24).
        await guidance.type('Author Guidelines', '');
        await saveShowingStatus(page, guidance);
        await visitor.reload();
        await expect(visitor.part('Author Guidelines')).toHaveCount(0);
        expect((await partHeadingNames(visitor))[0]).toBe('Submission Preparation Checklist');

        // "Privacy Statement" emptied: the part leaves the page (Rule 24;
        // Settings bullet 3).
        const website = new SettingsPages(page, tag);
        const privacy = await website.openWebsiteSetupTab('privacy');
        await privacy.typeRich('privacy-privacyStatement-control', '');
        await privacy.save();
        await visitor.reload();
        await expect(visitor.part('Privacy Statement')).toHaveCount(0);

        // Control: the same reload still shows the two parts whose texts are
        // set (Rule 24).
        expect(await partHeadingNames(visitor)).toEqual(['Submission Preparation Checklist', SECTION, 'Copyright Notice']);
        expect(await visitor.partText('Submission Preparation Checklist')).toBe('The manuscript is anonymised');
        expect(await visitor.partText('Copyright Notice')).toBe('Authors keep the copyright of their work');
    });

    test('S4: not accepting submissions', async ({browser, baseURL, asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const manager = account(tag, 'mg', 'Mia', 'Manager', ['manager']);
        const author = account(tag, 'au', 'Ada', 'Author', ['author']);
        await opsApi.createContext({tag, users: [manager, author]});

        // Accepting: the visitor's and the Author's lines (Rules 23a, 23b).
        const visitor = new AboutSubmissionsPage(await signedOutPage(browser, baseURL), tag);
        await visitor.open();
        await expectLine(visitor, SIGNED_OUT_LINE);
        const authorSubs = new AboutSubmissionsPage(await pageAs(asUser, author.username), tag);
        await authorSubs.open();
        await expectLine(authorSubs, SIGNED_IN_LINE);

        // "Disable Submissions": a heading and an unticked box of that name;
        // ticked and saved (Fields; Rules 2, 4).
        const page = await pageAs(asUser, manager.username);
        const wf = new WorkflowSubmissionSettings(page, tag, {listTitle: LIST_TITLE});
        await openBackend(page, tag);
        await wf.openFromSideMenu();
        await expect(wf.sideTab('Disable Submissions')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await wf.disableForm.ready();
        await expect(wf.disableHeading()).toBeVisible();
        await expect(wf.disableBox()).not.toBeChecked();
        await wf.disableBox().check();
        await saveShowingStatus(page, wf.disableForm);

        // The visitor's page: the not-accepting sentence with no link; the
        // parts stay under it (Rules 4d, 4f, 23c, 24).
        await visitor.reload();
        await expectLine(visitor, NOT_ACCEPTING);
        await expect(visitor.noticeLinks()).toHaveCount(0);
        expect(await partHeadingNames(visitor)).toEqual(
            expect.arrayContaining(['Author Guidelines', 'Submission Preparation Checklist', 'Privacy Statement'])
        );
        await expect(visitor.part('Author Guidelines')).toHaveCount(1);
        await expect(visitor.part('Submission Preparation Checklist')).toHaveCount(1);
        await expect(visitor.part('Privacy Statement')).toHaveCount(1);

        // The Author's page: the same sentence, no link (Rule 23c).
        await authorSubs.reload();
        await expectLine(authorSubs, NOT_ACCEPTING);
        await expect(authorSubs.noticeLinks()).toHaveCount(0);

        // The Journal Manager's page, from the header's "About" menu: the
        // same sentence (Rule 23c).
        const managerSubs = new AboutSubmissionsPage(page, tag);
        await managerSubs.gotoHome();
        await managerSubs.openFromMenu();
        await expectLine(managerSubs, NOT_ACCEPTING);
        await expect(managerSubs.noticeLinks()).toHaveCount(0);

        // Accepting again: unticked and saved; the visitor's and the
        // Author's lines are back (Rule 5).
        await wf.goto('Disable Submissions');
        await expect(wf.disableBox()).toBeChecked();
        await wf.disableBox().uncheck();
        await saveShowingStatus(page, wf.disableForm);
        await visitor.reload();
        await expectLine(visitor, SIGNED_OUT_LINE);
        await expect(visitor.noticeLinks()).toHaveCount(2);
        await authorSubs.reload();
        await expectLine(authorSubs, SIGNED_IN_LINE);
    });

    test('S5: the "Metadata" tab', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s5', testInfo);
        const manager = account(tag, 'mg', 'Mia', 'Manager', ['manager']);
        await opsApi.createContext({tag, users: [manager]});

        const page = await pageAs(asUser, manager.username);
        const wf = new WorkflowSubmissionSettings(page, tag, {listTitle: LIST_TITLE});
        const md = wf.metadata;
        const KEYWORDS = 'Enable keyword metadata';
        const SUBJECTS = 'Enable subject metadata';
        const KW_ASK = 'Ask the author to suggest keywords during submission.';
        const KW_NONE = 'Do not request keywords from the author during submission.';
        const KW_REQUIRE = 'Require the author to suggest keywords before accepting their submission.';

        // The tab: keywords ticked at "Ask …", subjects unticked with no
        // choices (Fields).
        await wf.goto();
        await wf.openSideTab('Metadata');
        await expect(md.box(KEYWORDS)).toBeChecked();
        await expect(md.choice(KEYWORDS, KW_ASK)).toBeChecked();
        await expect(md.box(SUBJECTS)).not.toBeChecked();
        await expect(md.choices(KEYWORDS)).toHaveCount(3);
        await expect(md.choices(SUBJECTS)).toHaveCount(0);

        // An item ticked: three choices, "Do not request …" selected (Rule 10).
        await md.box(SUBJECTS).check();
        await expect(md.choices(SUBJECTS)).toHaveCount(3);
        await expect(md.choiceStartingWith(SUBJECTS, 'Do not request')).toBeChecked();

        // Unticked and ticked again: back at "Do not request …" (Rule 10).
        await md.choice(KEYWORDS, KW_REQUIRE).check();
        await expect(md.choice(KEYWORDS, KW_REQUIRE)).toBeChecked();
        await md.box(KEYWORDS).uncheck();
        await expect(md.choices(KEYWORDS)).toHaveCount(0);
        await md.box(KEYWORDS).check();
        await expect(md.choices(KEYWORDS)).toHaveCount(3);
        await expect(md.choice(KEYWORDS, KW_NONE)).toBeChecked();

        // Saved (Rule 2).
        await md.choice(KEYWORDS, KW_REQUIRE).check();
        await saveShowingStatus(page, md);

        // After a reload: "Metadata" still open, the saved boxes and choices
        // (Rules 1, 10).
        await wf.reload();
        await expect(wf.sideTab('Metadata')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await md.ready();
        await expect(md.box(SUBJECTS)).toBeChecked();
        await expect(md.choiceStartingWith(SUBJECTS, 'Do not request')).toBeChecked();
        await expect(md.box(KEYWORDS)).toBeChecked();
        await expect(md.choice(KEYWORDS, KW_REQUIRE)).toBeChecked();

        // Control: "Enable coverage metadata", never touched, still unticked
        // after the reload (Fields).
        await expect(md.box('Enable coverage metadata')).not.toBeChecked();

        // Boxes that depend on another (Rule 11); each absence is read
        // against the box shown a moment before.
        const LOOKUP = 'Enable references structuring and metadata lookup';
        const GRANT = 'Enable Grant ID validation.';
        await expect(md.box(LOOKUP)).toBeVisible();
        await md.box('Enable references metadata').uncheck();
        await expect(md.box(LOOKUP)).toHaveCount(0);
        await md.box('Enable references metadata').check();
        await expect(md.box(LOOKUP)).toBeVisible();
        await expect(md.box(GRANT)).toBeVisible();
        await md.box('Enable funder metadata').uncheck();
        await expect(md.box(GRANT)).toHaveCount(0);
        await md.box('Enable funder metadata').check();
        await expect(md.box(GRANT)).toBeVisible();
    });

    test('S6: add and edit a component', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const manager = account(tag, 'mg', 'Mia', 'Manager', ['manager']);
        await opsApi.createContext({tag, users: [manager]});

        const page = await pageAs(asUser, manager.username);
        const wf = new WorkflowSubmissionSettings(page, tag, {listTitle: LIST_TITLE});
        const list = wf.components;

        // The list: its title, the three buttons left to right, the install
        // rows from "Preprint Text" to "Other" (Fields).
        await wf.goto();
        await wf.openSideTab('Components');
        await expect(list.heading()).toBeVisible();
        await expect(list.headerLinks()).toHaveText([whole('Order'), whole('Add a Component'), whole('Restore Defaults')]);
        await expect.poll(() => list.names()).toEqual(INSTALL_COMPONENTS);

        // "Add a Component": the empty window (Fields).
        let win = await list.openAdd();
        await expect(win.heading()).toHaveText(whole('Add a Component'));
        await expect(win.nameBox()).toHaveValue('');
        await expect(win.dependentBox()).not.toBeChecked();
        await expect(win.supplementaryBox()).not.toBeChecked();
        await expect(win.metadataChoice()).toHaveText(whole('Document'));
        await expect(win.requiredChoice(REQUIRE_NO)).toBeChecked();
        await expect(win.requiredNote()).toHaveText(whole('Required fields are marked with an asterisk: *'));
        await expect(win.cancelLink()).toBeVisible();
        await expect(win.saveButton()).toBeVisible();

        // An empty "Name": the message under the box, the window open (Rule 16).
        await win.saveRefusedInPlace(win.nameError());
        await expect(win.nameError()).toHaveText(whole(REQUIRED));
        await expect(win.form()).toBeVisible();

        // A malformed "Key": the notice at the top right, the window open
        // (Rule 16). Its "×" lies under the window's layer (finding T-ops-1),
        // so the test waits for the notice to go by itself.
        await win.typeName('Survey Forms');
        await win.typeKey('-survey');
        await markNotices(page);
        await win.save();
        const refused = notices(page, KEY_REFUSED, {fresh: true}).first();
        await expect(refused).toBeVisible({timeout: T});
        await expect(win.form()).toBeVisible();
        await expect(refused).toHaveCount(0, {timeout: T});

        // Added (Rule 14; where the row stands is A1's).
        await win.typeKey('SURVEY');
        await win.saveAndClose();
        await expect(list.row('Survey Forms')).toHaveCount(1);

        // A taken "Key" refused, then another key saved (Rule 16).
        win = await list.openAdd();
        await win.typeName('Survey Data');
        await win.typeKey('SURVEY');
        await markNotices(page);
        await win.save();
        const taken = notices(page, KEY_TAKEN, {fresh: true}).first();
        await expect(taken).toBeVisible({timeout: T});
        await expect(win.form()).toBeVisible();
        await win.typeKey('SURVEY-DATA');
        await win.saveAndClose();
        await expect(list.row('Survey Data')).toHaveCount(1);

        // Edited: the window titled "Edit" with the saved values; "Save"
        // closes it with no notice and the row is renamed (Rule 15).
        win = await list.openEdit('Survey Forms');
        await expect(win.heading()).toHaveText(whole('Edit'));
        await expect(win.nameBox()).toHaveValue('Survey Forms');
        await expect(win.keyBox()).toHaveValue('SURVEY');
        await win.typeName('Survey Instruments');
        await markNotices(page);
        await win.saveAndClose();
        await expect(list.row('Survey Instruments')).toHaveCount(1);
        await expect(list.row('Survey Forms')).toHaveCount(0);
        await expect(notices(page, undefined, {fresh: true})).toHaveCount(0);

        // An install component: "Key" shown but not editable, "Require with
        // Submissions" at "Yes" (Fields).
        win = await list.openEdit(MAIN_COMPONENT);
        await expect(win.keyBox()).toBeVisible();
        await expect(win.keyBox()).not.toBeEditable();
        await expect(win.requiredChoice(REQUIRE_YES)).toBeChecked();

        // "Cancel" after a change: closes without asking, nothing changed (Rule 15).
        await win.typeName('Main Text');
        const asked = await win.cancel();
        expect(asked, '"Cancel" asks nothing').toEqual([]);
        await expect(list.row(MAIN_COMPONENT)).toHaveCount(1);
        await expect(list.row('Main Text')).toHaveCount(0);

        // "Close" after a change asks first (Rule 15).
        win = await list.openEdit('Survey Instruments');
        await win.typeName('Surveys');
        expect(await closeWindowAsked(page, win)).toBe(FORM_CHANGED);

        // Control: the same list in the second browser (Rules 15, 16).
        const second = await pageAs(asUser, manager.username);
        const wf2 = new WorkflowSubmissionSettings(second, tag, {listTitle: LIST_TITLE});
        await wf2.goto();
        await wf2.openSideTab('Components');
        await expect(wf2.components.row('Survey Instruments')).toHaveCount(1);
        await expect(wf2.components.row('Survey Data')).toHaveCount(1);
        await expect(wf2.components.row('Survey Forms')).toHaveCount(0);
        await expect(wf2.components.row('Main Text')).toHaveCount(0);
        await expect(wf2.components.row(MAIN_COMPONENT)).toHaveCount(1);
    });

    test('S7: delete a component, restore the defaults and order the list', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const manager = account(tag, 'mg', 'Mia', 'Manager', ['manager']);
        const author = account(tag, 'au', 'Ada', 'Author', ['author']);
        await opsApi.createContext({
            tag,
            users: [manager, author],
            components: {'Field Notes': {metadata: 'document'}},
        });
        await opsApi.createSubmission({
            tag: `${tag}g`,
            context: tag,
            submitter: author.username,
            galleys: [{label: 'Data', file: 'preprint.pdf', genre: 'Data Set'}],
        });
        const draft = await opsApi.createSubmission({tag: `${tag}d`, context: tag, submitter: author.username, submitted: false});

        // The Author's draft, open on "Upload Files".
        const authorPage = await pageAs(asUser, author.username);
        await authorPage.goto(wizardUrl(tag, draft.submissionId));
        await expectStep(authorPage, STEPS.files);

        const page = await pageAs(asUser, manager.username);
        const wf = new WorkflowSubmissionSettings(page, tag, {listTitle: LIST_TITLE});
        const list = wf.components;
        await wf.goto();
        await wf.openSideTab('Components');
        await expect(list.row('Field Notes')).toHaveCount(1);

        // A delete refused: the "Delete" window, the browser pop-up, then
        // "Cancel" [A12]; "Data Set" stays (Rules 17, 17a).
        let del = await list.openDelete('Data Set');
        await expect(del.question()).toHaveText(whole(DELETE_QUESTION));
        await expect(del.button('OK')).toBeVisible();
        await expect(del.button('Cancel')).toBeVisible();
        expect(await list.confirmDeleteRefused(del)).toBe(DELETE_REFUSED);
        await del.answer('Cancel');
        await pastCloseWindow(page);
        await expect(list.row('Data Set')).toHaveCount(1);

        // Deleted: the row leaves the list (Rule 17b).
        del = await list.openDelete('Transcripts');
        await list.confirmDelete(del);
        await expect(list.row('Transcripts')).toHaveCount(0);
        await expect(list.row('Research Results')).toHaveCount(1);

        // The Author's upload: "Transcripts" not offered; the control is the
        // list's other components, "Data Set" among them (Rule 17b).
        await authorPage.reload();
        await expectStep(authorPage, STEPS.files);
        const {upload, genreSelect} = await openGalleyUpload(authorPage, 'PDF');
        const offered = await offeredComponents(genreSelect);
        expect(offered).toEqual(expect.arrayContaining([MAIN_COMPONENT, 'Data Set', 'Research Results', 'Data Analysis']));
        expect(offered).not.toContain('Transcripts');
        await completeGalleyUpload(authorPage, upload, genreSelect, MAIN_COMPONENT, 'PDF');

        // An install component renamed (Rule 15).
        const win = await list.openEdit('Other');
        await win.typeName('Other Files');
        await win.saveAndClose();
        await expect(list.row('Other Files')).toHaveCount(1);
        await expect(list.row('Other')).toHaveCount(0);

        // "Restore Defaults": asked, confirmed; "Transcripts" back in its
        // place, "Other" back, "Field Notes" kept [A1] (Rules 17c, 18).
        const restore = await list.openRestore();
        await expect(restore.question()).toHaveText(whole(RESTORE_QUESTION));
        await list.confirmRestore(restore);
        await expect.poll(async () => {
            const names = await list.names();
            return names.slice(names.indexOf('Research Results'), names.indexOf('Research Results') + 3);
        }).toEqual(['Research Results', 'Transcripts', 'Data Analysis']);
        await expect(list.row('Other')).toHaveCount(1);
        await expect(list.row('Other Files')).toHaveCount(0);
        await expect(list.row('Field Notes')).toHaveCount(1);

        // Ordering cancelled: "Other" dragged to the top, then the rows back
        // as they were, "Other" last (Rule 19).
        const before = await list.names();
        expect(before[before.length - 1]).toBe('Other');
        await list.startOrdering();
        await expect(list.dragHandles().first()).toBeVisible();
        await list.drag('Other', before[0]);
        await expect.poll(async () => (await list.names())[0]).toBe('Other');
        await list.cancelOrdering();
        await expect.poll(() => list.names()).toEqual(before);

        // Ordering done: "Other" first, and still first after a reload (Rule 19).
        await list.startOrdering();
        await list.drag('Other', before[0]);
        await expect.poll(async () => (await list.names())[0]).toBe('Other');
        await list.done();
        await expect.poll(async () => (await list.names())[0]).toBe('Other');
        await wf.reload();
        await expect(wf.sideTab('Components')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await list.waitLoaded();
        await expect.poll(async () => (await list.names())[0]).toBe('Other');

        // Control: "Data Set", whose delete was refused, still listed (Rule 17a).
        await expect(list.row('Data Set')).toHaveCount(1);
    });
});
