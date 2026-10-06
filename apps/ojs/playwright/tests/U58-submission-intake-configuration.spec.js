// @ts-check
/**
 * @file playwright/tests/U58-submission-intake-configuration.spec.js
 *
 * Submission intake configuration — OJS suite, one test per canonical
 * scenario the spec runs on OJS (S1–S7, all common).
 * Spec: docs/specs/U58-submission-intake-configuration.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A2 🐞
 * (no test opens the "Media" page after a delete), A7 🐞 and A8 🐞 (no help
 * text is asserted), A9 🐞 (no French list is read), A10 🐞 (no name of
 * spaces is saved), A12 🐞 (S7 presses "Cancel" after the refused delete and
 * never asserts the spinner), OJS1 🐞 (no LOCKSS page is read), A1 ❓ (S6 and
 * S7 assert an added component is listed, never its place), A3 ❓ (no key of
 * a deleted component is re-used), A4 ❓ ("Multimedia"'s window is never
 * opened), A5 ❓ (S2 never presses the Reader's "view your pending
 * submissions"), A6 ❓ (no site-wide privacy statement is configured), A11 ❓
 * (no default link's address is asserted), OMP1–OMP3, OPS1, OPS2 (press- and
 * server-only, in those trees; S3 asserts OJS's "For Reviewer Suggestion"
 * box). The spec's Coverage section records everything else left out.
 *
 * Seeding: scenario endpoints only. S1 reads the seeded journal signed out,
 * read-only. S2–S7 each run on their own scratch journal
 * (`POST scenarios/context`) with throwaway accounts whose names carry app,
 * scenario and worker (u58s2ojw0…); S4 seeds the "Make a Submission" block
 * with the `plugins` and `sidebar` keys, S7 the added component "Field
 * Notes" with `components`; the drafts of S3 and S7 and S7's submission
 * whose file carries "Data Set" come from `POST scenarios/submission`.
 * Every other setting is changed on the tabs themselves, the feature under
 * test. publicknowledge and the 18 seeded users are never changed (A1, A7).
 * Every actor has its own browser context (`asUser`, or a context with an
 * empty storage state for the visitor), never a sign-out. Every absence is
 * read with a settled locator and paired with a positive control taken the
 * same way (M4, M6): the missing "Edit" beside the present one on the
 * manager's page, the missing part beside the parts still shown, the
 * missing link of the not-accepting line beside the links the same line
 * carried before, the missing component beside the one still offered, the
 * refused programming-interface read beside the Author's list. No
 * hard-coded waits (A5).
 */
const {test, expect} = require('../support/fixtures.js');
const {StartSubmissionPage, SubmissionWizardPage, FIXTURE_PDF} = require('../pages/SubmissionWizardPage.js');
const {WizardFilesPanel} = require('../../../../shared/playwright/pages/SubmissionFilesPages.js');
const {SettingsPages} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');
const {
    WorkflowSubmissionSettings,
    AboutSubmissionsPage,
    ComponentsList,
    saveShowingStatus,
    pageNotices,
} = require('../../../../shared/playwright/pages/SubmissionIntakePages.js');

const T = 30_000;
const JOURNAL = 'publicknowledge';
const DEFAULT_GUIDELINES_OPENING = 'Authors are invited to make a submission to this journal.';
const DEFAULT_CHECKLIST_OPENING = 'All submissions must meet the following requirements.';
const DEFAULT_UPLOAD_OPENING = 'Provide any files our editorial team may need to evaluate your submission.';
const SECTION = 'Articles';
const SECTION_POLICY = 'Section default policy';
const SIGNED_OUT_LINE = 'Login or Register to make a submission.';
const SIGNED_IN_LINE = 'Make a new submission or view your pending submissions.';
const NOT_ACCEPTING_LINE = 'This journal is not accepting submissions at this time.';
const SIDE_TAB_NAMES = ['Disable Submissions', 'Author Guidance', 'Metadata', 'Components', 'Contributor Roles'];
const INSTALL_COMPONENTS = [
    'Article Text',
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
const KEY_MALFORMED =
    'The key can contain only alphanumeric characters, underscores, and hyphens, and must begin and end with an alphanumeric character.';
const KEY_TAKEN = 'The key already exists.';
const DELETE_QUESTION = 'Are you sure you wish to delete this item? This action cannot be undone.';
const DELETE_REFUSED =
    'Before this component can be deleted, you must associate all related submission files with a different component.';
const RESTORE_QUESTION = 'Are you sure you wish to restore the defaults?';
const FORM_CHANGED = 'The data on this form has changed. Do you wish to continue without saving?';
const REQUIRE_YES = 'Yes, require submitting authors to upload one or more of these files.';
const REQUIRE_NO = 'No, allow new submissions without these files.';
const KEYWORDS_REQUIRE = 'Require the author to suggest keywords before accepting their submission.';
const KEYWORDS_ASK = 'Ask the author to suggest keywords during submission.';
const KEYWORDS_DO_NOT = 'Do not request keywords from the author during submission.';

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u58${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for a scratch journal (users.md: `<username>@mail.test`). */
function account(tag, suffix, givenName, familyName, roles) {
    return {username: `${tag}${suffix}`, givenName, familyName, email: `${tag}${suffix}@mail.test`, roles};
}

/** A signed-out browser page (no inherited storage state). */
async function signedOutPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'});
    return context.newPage();
}

/** Every browser question a page asks from now on (answered: beforeunload accepted, the rest dismissed). */
function recordDialogs(page) {
    const asked = [];
    page.on('dialog', (d) => {
        asked.push(`${d.type()}: ${d.message()}`);
        (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {});
    });
    return asked;
}

/** A dashboard view's heading ("Assigned to me (0)", "Action Required by me (0)", "Active submissions (0)"). */
function viewHeading(page, name) {
    return page.getByRole('heading', {name: new RegExp(`^${name}`)});
}

test.describe('submission intake configuration', () => {
    test('S1: a visitor reads the "Submissions" page', {tag: '@smoke'}, async ({browser, baseURL}) => {
        const page = await signedOutPage(browser, baseURL);
        const about = new AboutSubmissionsPage(page, JOURNAL, {locale: 'en'});

        // The page, from the header's "About" menu: breadcrumb, heading, line.
        await about.gotoHome();
        await about.openFromMenu();
        expect(await about.breadcrumbTrail()).toEqual(['Home', 'Submissions']);
        await expect(about.pageHeading()).toHaveText('Submissions');
        await about.expectLine(SIGNED_OUT_LINE);

        // The parts, in order, with their openings (Rule 24).
        await expect.poll(() => about.partHeadingNames()).toEqual([
            'Author Guidelines',
            'Submission Preparation Checklist',
            SECTION,
            'Privacy Statement',
        ]);
        expect(await about.partText('Author Guidelines')).toMatch(new RegExp(`^${DEFAULT_GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        expect(await about.partText('Submission Preparation Checklist')).toMatch(new RegExp(`^${DEFAULT_CHECKLIST_OPENING.replace(/\./g, '\\.')}`));
        expect(await about.partText(SECTION)).toBe(SECTION_POLICY);

        // Control: no "Copyright Notice" part and no "Edit" link (Actors row 7).
        await expect(about.part('Copyright Notice')).toHaveCount(0);
        await expect(about.editLinks()).toHaveCount(0);

        // "Login": the Login page; back; "Register": the Register page (Rule 23a).
        await about.noticeLink('Login').click();
        await expect(page.locator('form#login')).toBeVisible({timeout: T});
        await page.goBack();
        await expect(about.pageHeading()).toBeVisible({timeout: T});
        await about.noticeLink('Register').click();
        await expect(page.locator('form#register')).toBeVisible({timeout: T});
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${JOURNAL}/(en/)?user/register`));
    });

    test('S2: each role\'s links on the "Submissions" page', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s2', testInfo);
        const users = {
            manager: account(tag, 'mg', 'Mona', 'Manager', ['manager']),
            sectionEditor: account(tag, 'se', 'Sid', 'Section', ['sectionEditor']),
            assistant: account(tag, 'as', 'Abe', 'Assistant', ['funding']),
            author: account(tag, 'au', 'Ava', 'Author', ['author']),
            reviewer: account(tag, 'rv', 'Rae', 'Reviewer', ['externalReviewer']),
            authorReviewer: account(tag, 'ar', 'Ari', 'Both', ['author', 'externalReviewer']),
            reader: account(tag, 'rd', 'Rex', 'Reader', ['reader']),
        };
        await ojsApi.createContext({tag, users: Object.values(users)});

        // The Journal Manager's page: the line, "Edit" beside three headings
        // and not beside the section's (Rules 23b, 25).
        const mPage = await (await asUser(users.manager.username)).newPage();
        const mAbout = new AboutSubmissionsPage(mPage, tag);
        await mAbout.gotoHome();
        await mAbout.openFromMenu();
        await mAbout.expectLine(SIGNED_IN_LINE);
        await expect.poll(() => mAbout.partHeadingNames()).toEqual(['Author Guidelines', 'Submission Preparation Checklist', SECTION, 'Privacy Statement']);
        for (const part of ['Author Guidelines', 'Submission Preparation Checklist', 'Privacy Statement']) {
            await expect(mAbout.partEditLink(part)).toHaveCount(1);
            await expect(mAbout.partEditLink(part)).toHaveText(/Edit/);
        }
        await expect(mAbout.part(SECTION).locator('a.cmp_edit_link')).toHaveCount(0);
        await expect(mAbout.editLinks()).toHaveCount(3);

        // The Journal Manager's "Edit" links (Rule 25).
        const mSettings = new WorkflowSubmissionSettings(mPage, tag);
        for (const part of ['Author Guidelines', 'Submission Preparation Checklist']) {
            await mAbout.partEditLink(part).click();
            await mSettings.waitLoaded();
            await expect(mSettings.submissionTab).toHaveAttribute('aria-selected', 'true');
            await expect(mSettings.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
            await expect(mSettings.sidePanel('Author Guidance')).toBeVisible();
            // "Go back": the side tab's address entries sit between, so the
            // page is opened again.
            await mAbout.open();
        }
        await mAbout.partEditLink('Privacy Statement').click();
        const mWebsite = new SettingsPages(mPage, tag);
        await expect(mWebsite.heading).toHaveText('Website Settings', {timeout: T});
        await expect(mWebsite.tab('Setup')).toHaveAttribute('aria-selected', 'true');
        await expect(mWebsite.selectedSideTab('Setup')).toHaveText('Privacy Statement', {timeout: T});
        await mWebsite.privacyForm().ready();
        await mAbout.open();

        // The Journal Manager's pending submissions: "Assigned to me" (Rule 23b).
        await mAbout.noticeLink('view your pending submissions').click();
        await expect(viewHeading(mPage, 'Assigned to me')).toBeVisible({timeout: T});

        // The Section Editor and the assistant (Actors row 7; Rules 23b, 25).
        for (const who of [users.sectionEditor, users.assistant]) {
            const p = await (await asUser(who.username)).newPage();
            const a = new AboutSubmissionsPage(p, tag);
            await a.open();
            await a.expectLine(SIGNED_IN_LINE);
            await expect.poll(() => a.partHeadingNames()).toEqual(['Author Guidelines', 'Submission Preparation Checklist', SECTION, 'Privacy Statement']);
            await expect(a.editLinks()).toHaveCount(0);
            await a.noticeLink('view your pending submissions').click();
            await expect(viewHeading(p, 'Assigned to me')).toBeVisible({timeout: T});
        }

        // The Author's page: the line, no "Edit"; "My Submissions" on
        // "Active submissions"; the start screen (Rules 23b, 25).
        const aPage = await (await asUser(users.author.username)).newPage();
        const aAbout = new AboutSubmissionsPage(aPage, tag);
        await aAbout.open();
        await aAbout.expectLine(SIGNED_IN_LINE);
        await expect.poll(() => aAbout.partHeadingNames()).toEqual(['Author Guidelines', 'Submission Preparation Checklist', SECTION, 'Privacy Statement']);
        await expect(aAbout.editLinks()).toHaveCount(0);
        await aAbout.noticeLink('view your pending submissions').click();
        await expect(viewHeading(aPage, 'Active submissions')).toBeVisible({timeout: T});
        await aPage.goBack();
        await expect(aAbout.pageHeading()).toBeVisible({timeout: T});
        await aAbout.noticeLink('Make a new submission').click();
        const aStart = new StartSubmissionPage(aPage, tag);
        await expect(aStart.heading()).toBeVisible({timeout: T});
        await expect(aStart.beginButton()).toBeVisible();

        // The Author reads the components (Actors row 8; Rule 28).
        const authorGenres = await new ComponentsList(aPage).readComponentsAddress(tag);
        expect(authorGenres.ok).toBe(true);
        expect(authorGenres.names).toContain('Article Text');

        // The Reviewer: the line, no "Edit"; the reviewer dashboard; the
        // start screen; the components' address refused (Rules 23b, 25, 28).
        const rPage = await (await asUser(users.reviewer.username)).newPage();
        const rAbout = new AboutSubmissionsPage(rPage, tag);
        await rAbout.open();
        await rAbout.expectLine(SIGNED_IN_LINE);
        await expect.poll(() => rAbout.partHeadingNames()).toEqual(['Author Guidelines', 'Submission Preparation Checklist', SECTION, 'Privacy Statement']);
        await expect(rAbout.editLinks()).toHaveCount(0);
        await rAbout.noticeLink('view your pending submissions').click();
        await expect(viewHeading(rPage, 'Action Required by me')).toBeVisible({timeout: T});
        await rPage.goBack();
        await expect(rAbout.pageHeading()).toBeVisible({timeout: T});
        await rAbout.noticeLink('Make a new submission').click();
        const rStart = new StartSubmissionPage(rPage, tag);
        await expect(rStart.heading()).toBeVisible({timeout: T});
        await expect(rStart.beginButton()).toBeVisible();
        const reviewerGenres = await new ComponentsList(rPage).readComponentsAddress(tag);
        expect(reviewerGenres.ok).toBe(false);
        expect(reviewerGenres.status).toBeGreaterThanOrEqual(400);
        expect(reviewerGenres.names).toBeNull();

        // The Author who is also a Reviewer: the reviewer dashboard (Rule 23b).
        const arPage = await (await asUser(users.authorReviewer.username)).newPage();
        const arAbout = new AboutSubmissionsPage(arPage, tag);
        await arAbout.open();
        await arAbout.noticeLink('view your pending submissions').click();
        await expect(viewHeading(arPage, 'Action Required by me')).toBeVisible({timeout: T});

        // Control: the Reader's line, no "Edit", the components refused.
        const rdPage = await (await asUser(users.reader.username)).newPage();
        const rdAbout = new AboutSubmissionsPage(rdPage, tag);
        await rdAbout.open();
        await rdAbout.expectLine(SIGNED_IN_LINE);
        await expect.poll(() => rdAbout.partHeadingNames()).toEqual(['Author Guidelines', 'Submission Preparation Checklist', SECTION, 'Privacy Statement']);
        await expect(rdAbout.editLinks()).toHaveCount(0);
        const readerGenres = await new ComponentsList(rdPage).readComponentsAddress(tag);
        expect(readerGenres.ok).toBe(false);
        expect(readerGenres.status).toBeGreaterThanOrEqual(400);
        expect(readerGenres.names).toBeNull();
    });

    test('S3: author guidance on the "Submissions" page and in the wizard', async ({browser, baseURL, asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s3', testInfo);
        const manager = account(tag, 'mg', 'Mona', 'Manager', ['manager']);
        const author = account(tag, 'au', 'Ava', 'Author', ['author']);
        await ojsApi.createContext({tag, users: [manager, author]});
        const {submissionId} = await ojsApi.createSubmission({tag, context: tag, submitter: author.username, submitted: false});

        // The visitor on the "Submissions" page, the Author's draft open at "Upload Files".
        const visitor = await signedOutPage(browser, baseURL);
        const vAbout = new AboutSubmissionsPage(visitor, tag);
        await vAbout.open();
        await expect.poll(() => vAbout.partHeadingNames()).toEqual(['Author Guidelines', 'Submission Preparation Checklist', SECTION, 'Privacy Statement']);
        const aPage = await (await asUser(author.username)).newPage();
        const wizard = new SubmissionWizardPage(aPage, tag);
        await wizard.goto(submissionId);
        await wizard.expectStep('Upload Files');
        await expect(aPage.locator('main')).toContainText(DEFAULT_UPLOAD_OPENING, {timeout: T});

        // "Workflow Settings" from the side menu: "Submission" › "Disable
        // Submissions"; the five side tabs (Fields; Rules 1, 21).
        const page = await (await asUser(manager.username)).newPage();
        const asked = recordDialogs(page);
        const settings = new WorkflowSubmissionSettings(page, tag);
        await page.goto(`/index.php/${tag}/submissions`);
        await settings.openFromSideMenu();
        await expect(settings.submissionTab).toHaveAttribute('aria-selected', 'true');
        await expect(settings.sideTab('Disable Submissions')).toHaveAttribute('aria-selected', 'true');
        await expect(settings.sideTabs()).toHaveText(SIDE_TAB_NAMES);

        // "Author Guidance": the default guidelines, an empty copyright
        // notice, "For the Editors" and "For Reviewer Suggestion" (Fields).
        await settings.openSideTab('Author Guidance');
        const guidance = settings.guidance;
        expect(await guidance.text('Author Guidelines')).toMatch(new RegExp(`^${DEFAULT_GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        expect(await guidance.text('Copyright Notice')).toBe('');
        await expect(guidance.label('For the Editors')).toHaveCount(1);
        await expect(guidance.label('For Reviewer Suggestion')).toHaveCount(1);
        await expect(guidance.label('For Readers')).toHaveCount(0);

        // A reload keeps "Author Guidance" (Rule 1).
        await settings.reload();
        await expect(settings.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await guidance.ready();

        // Typed, not saved: kept across side tabs, gone on reload, nothing asks (Rules 2, 7).
        await guidance.type('Author Guidelines', 'Unsaved guidance');
        await settings.openSideTab('Metadata');
        await settings.openSideTab('Author Guidance');
        expect(await guidance.text('Author Guidelines')).toBe('Unsaved guidance');
        await vAbout.reload();
        expect(await vAbout.partText('Author Guidelines')).toMatch(new RegExp(`^${DEFAULT_GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        await page.locator('main h1').first().click();
        await settings.reload();
        await expect(settings.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await guidance.ready();
        expect(await guidance.text('Author Guidelines')).toMatch(new RegExp(`^${DEFAULT_GUIDELINES_OPENING.replace(/\./g, '\\.')}`));
        expect(asked, 'nothing asks before the reload').toEqual([]);

        // Texts saved: "Saving", then "Saved", no page notice (Rule 2).
        await guidance.type('Author Guidelines', 'Send your manuscript as a Word file');
        await guidance.type('Before you begin', 'Read the guidelines first');
        await guidance.type('Submission Checklist', 'The manuscript is anonymised');
        await guidance.type('Upload Files', 'Upload the manuscript and its figures');
        await guidance.type('Copyright Notice', 'Authors keep the copyright of their work');
        await saveShowingStatus(page, guidance);

        // The visitor's page (Rules 7, 24).
        await vAbout.reload();
        expect(await vAbout.partText('Author Guidelines')).toBe('Send your manuscript as a Word file');
        expect(await vAbout.partText('Submission Preparation Checklist')).toBe('The manuscript is anonymised');
        await expect.poll(() => vAbout.partHeadingNames()).toEqual([
            'Author Guidelines',
            'Submission Preparation Checklist',
            SECTION,
            'Copyright Notice',
            'Privacy Statement',
        ]);
        expect(await vAbout.partText('Copyright Notice')).toBe('Authors keep the copyright of their work');

        // The Author's open draft keeps the earlier text until reloaded (Rule 7).
        await expect(aPage.locator('main')).toContainText(DEFAULT_UPLOAD_OPENING);
        await expect(aPage.locator('main')).not.toContainText('Upload the manuscript and its figures');
        await aPage.reload();
        await wizard.expectLoaded();
        await wizard.expectStep('Upload Files');
        await expect(aPage.locator('main')).toContainText('Upload the manuscript and its figures', {timeout: T});
        await expect(aPage.locator('main')).not.toContainText(DEFAULT_UPLOAD_OPENING);

        // The Author's start screen (Fields; Rule 7).
        const aAbout = new AboutSubmissionsPage(aPage, tag);
        await aAbout.open();
        await aAbout.noticeLink('Make a new submission').click();
        const start = new StartSubmissionPage(aPage, tag);
        await expect(start.heading()).toBeVisible({timeout: T});
        await expect(aPage.locator('main')).toContainText('Read the guidelines first', {timeout: T});
        const confirmation = aPage.locator('.pkpFormField').filter({has: start.checklistBox()}).first();
        await expect(confirmation).toContainText('The manuscript is anonymised');

        // "Edit" beside "Copyright Notice": "Author Guidance" (Rule 25).
        const mAbout = new AboutSubmissionsPage(page, tag);
        await mAbout.open();
        await mAbout.partEditLink('Copyright Notice').click();
        await settings.waitLoaded();
        await expect(settings.sideTab('Author Guidance')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await guidance.ready();

        // "Author Guidelines" emptied: the part leaves the page (Rules 8, 24).
        await guidance.type('Author Guidelines', '');
        await guidance.save();
        await vAbout.reload();
        await expect(vAbout.part('Author Guidelines')).toHaveCount(0);
        await expect.poll(async () => (await vAbout.partHeadingNames())[0]).toBe('Submission Preparation Checklist');

        // "Privacy Statement" emptied: the part leaves the page (Rule 24; Settings bullet 3).
        const website = new SettingsPages(page, tag);
        const privacy = await website.openWebsiteSetupTab('privacy');
        await privacy.typeRich('privacy-privacyStatement-control', '');
        await privacy.save();
        await vAbout.reload();
        await expect(vAbout.part('Privacy Statement')).toHaveCount(0);

        // Control: the parts whose texts are set are still there (Rule 24).
        await expect.poll(() => vAbout.partHeadingNames()).toEqual(['Submission Preparation Checklist', SECTION, 'Copyright Notice']);
    });

    test('S4: not accepting submissions', async ({browser, baseURL, asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const manager = account(tag, 'mg', 'Mona', 'Manager', ['manager']);
        const author = account(tag, 'au', 'Ava', 'Author', ['author']);
        await ojsApi.createContext({
            tag,
            plugins: {makesubmissionblockplugin: {enabled: true}},
            sidebar: ['makesubmissionblockplugin'],
            users: [manager, author],
        });

        // Accepting: the visitor's and the Author's lines (Rules 23a, 23b).
        const visitor = await signedOutPage(browser, baseURL);
        const vAbout = new AboutSubmissionsPage(visitor, tag);
        await vAbout.open();
        await vAbout.expectLine(SIGNED_OUT_LINE);
        await expect(vAbout.noticeLinks()).toHaveText(['Login', 'Register']);
        const aPage = await (await asUser(author.username)).newPage();
        const aAbout = new AboutSubmissionsPage(aPage, tag);
        await aAbout.open();
        await aAbout.expectLine(SIGNED_IN_LINE);
        await expect(aAbout.noticeLinks()).toHaveText(['Make a new submission', 'view your pending submissions']);

        // "Disable Submissions": heading and box, unticked; ticked and saved (Fields; Rules 2, 4).
        const page = await (await asUser(manager.username)).newPage();
        const settings = new WorkflowSubmissionSettings(page, tag);
        await settings.goto();
        await expect(settings.sideTab('Disable Submissions')).toHaveAttribute('aria-selected', 'true');
        await settings.disableForm.ready();
        await expect(settings.disableHeading()).toBeVisible();
        await expect(settings.disableBox()).not.toBeChecked();
        await settings.disableBox().check();
        await saveShowingStatus(page, settings.disableForm);

        // The visitor's page: the not-accepting sentence, no link (Rules 4d, 23c).
        await vAbout.reload();
        await vAbout.expectLine(NOT_ACCEPTING_LINE);
        await expect(vAbout.noticeLinks()).toHaveCount(0);
        // Control: the parts still stand under the sentence (Rules 4f, 24).
        await expect.poll(() => vAbout.partHeadingNames()).toEqual(['Author Guidelines', 'Submission Preparation Checklist', SECTION, 'Privacy Statement']);

        // The Author's page (Rule 23c).
        await aAbout.reload();
        await aAbout.expectLine(NOT_ACCEPTING_LINE);
        await expect(aAbout.noticeLinks()).toHaveCount(0);

        // The Journal Manager's page, from the header's "About" menu (Rule 23c).
        const mAbout = new AboutSubmissionsPage(page, tag);
        await mAbout.gotoHome();
        await mAbout.openFromMenu();
        await mAbout.expectLine(NOT_ACCEPTING_LINE);
        await expect(mAbout.noticeLinks()).toHaveCount(0);

        // The sidebar's "Make a Submission" block still leads to the page (Rules 4f, 22).
        await vAbout.gotoHome();
        await vAbout.makeSubmissionBlockLink().click();
        await expect(vAbout.pageHeading()).toBeVisible({timeout: T});
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${tag}/about/submissions`));
        await vAbout.expectLine(NOT_ACCEPTING_LINE);

        // Accepting again (Rule 5).
        await settings.goto();
        await settings.disableForm.ready();
        await expect(settings.disableBox()).toBeChecked();
        await settings.disableBox().uncheck();
        await settings.disableForm.save();
        await vAbout.reload();
        await vAbout.expectLine(SIGNED_OUT_LINE);
        await aAbout.reload();
        await aAbout.expectLine(SIGNED_IN_LINE);
    });

    test('S5: the "Metadata" tab', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const manager = account(tag, 'mg', 'Mona', 'Manager', ['manager']);
        await ojsApi.createContext({tag, users: [manager]});
        const page = await (await asUser(manager.username)).newPage();
        const settings = new WorkflowSubmissionSettings(page, tag);
        const md = settings.metadata;

        // The tab at the install's settings (Fields).
        await settings.goto('Metadata');
        await expect(md.box('Enable keyword metadata')).toBeChecked();
        await expect(md.choice('Enable keyword metadata', KEYWORDS_ASK)).toBeChecked();
        await expect(md.box('Enable subject metadata')).not.toBeChecked();
        await expect(md.choices('Enable subject metadata')).toHaveCount(0);
        await expect(md.box('Enable coverage metadata')).not.toBeChecked();

        // An item ticked: three choices, "Do not request …" selected (Rule 10).
        await md.box('Enable subject metadata').check();
        await expect(md.choices('Enable subject metadata')).toHaveCount(3);
        await expect(md.choiceStartingWith('Enable subject metadata', 'Do not request')).toBeChecked();

        // Unticked and ticked again: back at "Do not request …" (Rule 10).
        await md.choice('Enable keyword metadata', KEYWORDS_REQUIRE).check();
        await md.box('Enable keyword metadata').uncheck();
        await expect(md.choices('Enable keyword metadata')).toHaveCount(0);
        await md.box('Enable keyword metadata').check();
        await expect(md.choices('Enable keyword metadata')).toHaveCount(3);
        await expect(md.choice('Enable keyword metadata', KEYWORDS_DO_NOT)).toBeChecked();

        // Saved (Rule 2).
        await md.choice('Enable keyword metadata', KEYWORDS_REQUIRE).check();
        await saveShowingStatus(page, md);

        // After a reload: still "Metadata"; the saved boxes and choices (Rules 1, 10).
        await settings.reload();
        await expect(settings.sideTab('Metadata')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await md.ready();
        await expect(md.box('Enable subject metadata')).toBeChecked();
        await expect(md.choiceStartingWith('Enable subject metadata', 'Do not request')).toBeChecked();
        await expect(md.box('Enable keyword metadata')).toBeChecked();
        await expect(md.choice('Enable keyword metadata', KEYWORDS_REQUIRE)).toBeChecked();

        // Boxes that depend on another (Rule 11).
        const lookup = md.box('Enable references structuring and metadata lookup');
        await expect(lookup).toBeVisible();
        await md.box('Enable references metadata').uncheck();
        await expect(lookup).toHaveCount(0);
        await md.box('Enable references metadata').check();
        await expect(lookup).toBeVisible();
        const grantId = md.box('Enable Grant ID validation.');
        await expect(grantId).toBeVisible();
        await md.box('Enable funder metadata').uncheck();
        await expect(grantId).toHaveCount(0);
        await md.box('Enable funder metadata').check();
        await expect(grantId).toBeVisible();

        // Control: "Enable coverage metadata", never touched, still unticked (Fields).
        await expect(md.box('Enable coverage metadata')).not.toBeChecked();
    });

    test('S6: add and edit a component', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const manager = account(tag, 'mg', 'Mona', 'Manager', ['manager']);
        await ojsApi.createContext({tag, users: [manager]});
        const page = await (await asUser(manager.username)).newPage();
        const settings = new WorkflowSubmissionSettings(page, tag);
        const list = settings.components;

        // The list (Fields).
        await settings.goto('Components');
        await expect(list.heading()).toBeVisible();
        await expect(list.headerLinks()).toHaveText(['Order', 'Add a Component', 'Restore Defaults']);
        await expect.poll(() => list.names()).toEqual(INSTALL_COMPONENTS);

        // "Add a Component": the empty window (Fields).
        let win = await list.openAdd();
        await expect(win.heading()).toHaveText('Add a Component');
        await expect(win.nameBox()).toHaveValue('');
        await expect(win.dependentBox()).not.toBeChecked();
        await expect(win.supplementaryBox()).not.toBeChecked();
        await expect(win.metadataChoice()).toHaveText('Document');
        await expect(win.requiredChoice(REQUIRE_NO)).toBeChecked();
        await expect(win.requiredChoice(REQUIRE_YES)).not.toBeChecked();
        await expect(win.requiredNote()).toHaveText('Required fields are marked with an asterisk: *');
        await expect(win.saveButton()).toBeVisible();
        await expect(win.cancelLink()).toBeVisible();

        // An empty "Name": the message under the box; the window stays (Rule 16).
        const sent = await win.saveRefusedInPlace(win.nameError());
        expect(sent, 'the browser refuses the save before sending it').toBe(0);
        await expect(win.nameError()).toHaveText('This field is required.');
        await expect(win.form()).toBeVisible();

        // A malformed "Key": the notice at the top right; closed with its "×" (Rule 16).
        await win.typeName('Survey Forms');
        await win.typeKey('-survey');
        await win.save();
        const malformed = pageNotices(page, KEY_MALFORMED);
        await expect(malformed).toBeVisible({timeout: T});
        await expect(win.form()).toBeVisible();
        // Its "×" removes it at once (well inside its five seconds), the window
        // still open (A13 retired, pkp/pkp-lib#13188).
        await malformed.getByRole('button', {name: 'Close'}).click();
        await expect(malformed).toHaveCount(0, {timeout: 2_000});
        await expect(win.form()).toBeVisible();

        // Added: the list gains "Survey Forms" [A1] (Rule 14).
        await win.typeKey('SURVEY');
        await win.saveAndClose();
        await expect(list.row('Survey Forms')).toHaveCount(1, {timeout: T});

        // A taken "Key": refused; then saved under another key (Rule 16).
        win = await list.openAdd();
        await win.typeName('Survey Data');
        await win.typeKey('SURVEY');
        await win.save();
        await expect(pageNotices(page, KEY_TAKEN)).toBeVisible({timeout: T});
        await expect(win.form()).toBeVisible();
        await win.typeKey('SURVEY-DATA');
        await win.saveAndClose();
        await expect(list.row('Survey Data')).toHaveCount(1, {timeout: T});
        await expect(pageNotices(page, KEY_TAKEN)).toHaveCount(0, {timeout: T});

        // Edited: the window shows the saved values; "Save" closes it with no notice (Rule 15).
        win = await list.openEdit('Survey Forms');
        await expect(win.heading()).toHaveText('Edit');
        await expect(win.nameBox()).toHaveValue('Survey Forms');
        await expect(win.keyBox()).toHaveValue('SURVEY');
        await win.typeName('Survey Instruments');
        await win.saveAndClose();
        await expect(list.row('Survey Instruments')).toHaveCount(1, {timeout: T});
        await expect(list.row('Survey Forms')).toHaveCount(0);
        await expect(pageNotices(page)).toHaveCount(0);

        // An install component: its "Key" shown but fixed; "Require" at "Yes" (Fields).
        win = await list.openEdit('Article Text');
        await expect(win.keyBox()).toBeVisible();
        await expect(win.keyBox()).not.toHaveValue('');
        await expect(win.keyBox()).not.toBeEditable();
        await expect(win.requiredChoice(REQUIRE_YES)).toBeChecked();

        // "Cancel" after a change: closes without asking; the row unchanged (Rule 15).
        await win.typeName('Main Text');
        const askedOnCancel = await win.cancel();
        expect(askedOnCancel, '"Cancel" asks nothing').toEqual([]);
        await expect(list.row('Article Text')).toHaveCount(1);
        await expect(list.row('Main Text')).toHaveCount(0);

        // "Close" after a change: the browser asks (Rule 15).
        win = await list.openEdit('Survey Instruments');
        await win.typeName('Surveys');
        await win.nameBox().blur();
        expect(await win.closeAsked({accept: true})).toBe(FORM_CHANGED);

        // Control: the second browser's list (Rules 15, 16).
        const second = await (await asUser(manager.username)).newPage();
        const secondSettings = new WorkflowSubmissionSettings(second, tag);
        await secondSettings.goto('Components');
        const secondList = secondSettings.components;
        await expect(secondList.row('Survey Instruments')).toHaveCount(1);
        await expect(secondList.row('Survey Data')).toHaveCount(1);
        await expect(secondList.row('Survey Forms')).toHaveCount(0);
        await expect(secondList.row('Main Text')).toHaveCount(0);
        await expect(secondList.row('Article Text')).toHaveCount(1);
    });

    test('S7: delete a component, restore the defaults and order the list', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s7', testInfo);
        const manager = account(tag, 'mg', 'Mona', 'Manager', ['manager']);
        const author = account(tag, 'au', 'Ava', 'Author', ['author']);
        await ojsApi.createContext({tag, components: {'Field Notes': {}}, users: [manager, author]});
        await ojsApi.createSubmission({
            tag: `${tag}d`,
            context: tag,
            submitter: author.username,
            files: [{file: 'article.pdf'}, {file: 'notes.md', genre: 'Data Set'}],
        });
        const {submissionId: draftId} = await ojsApi.createSubmission({tag: `${tag}w`, context: tag, submitter: author.username, submitted: false});

        // The Author's draft open at "Upload Files".
        const aPage = await (await asUser(author.username)).newPage();
        const wizard = new SubmissionWizardPage(aPage, tag);
        await wizard.goto(draftId);
        await wizard.expectStep('Upload Files');

        const page = await (await asUser(manager.username)).newPage();
        const settings = new WorkflowSubmissionSettings(page, tag);
        const list = settings.components;
        await settings.goto('Components');
        await expect(list.row('Field Notes')).toHaveCount(1);

        // A delete refused: the question, the browser pop-up, "Cancel"; the row stays (Rules 17, 17a).
        let del = await list.openDelete('Data Set');
        await expect(del.question()).toHaveText(new RegExp(`^\\s*${DELETE_QUESTION.replace(/[.?]/g, '\\$&')}\\s*$`));
        await expect(del.button('OK')).toBeVisible();
        await expect(del.button('Cancel')).toBeVisible();
        expect(await list.confirmDeleteRefused(del)).toBe(DELETE_REFUSED);
        await list.dismiss(del);
        await expect(list.row('Data Set')).toHaveCount(1);

        // Deleted: "Transcripts" leaves the list (Rule 17b).
        del = await list.openDelete('Transcripts');
        const deleted = await list.confirmDelete(del);
        expect(deleted.status()).toBe(200);
        await expect(list.row('Transcripts')).toHaveCount(0, {timeout: T});
        await expect(list.row('Research Results')).toHaveCount(1);

        // The Author's upload: "Transcripts" not offered; "Data Set" still is (Rule 17b).
        await aPage.reload();
        await wizard.expectLoaded();
        await wizard.expectStep('Upload Files');
        const files = new WizardFilesPanel(aPage);
        const row = await files.add(files.emptyUploadButton(), FIXTURE_PDF, 'article.pdf');
        await expect(files.genrePrompt(row)).toHaveText('What kind of file is this?');
        await files.genreButtons(row).filter({hasText: /^\s*Other\s*$/}).click();
        const editPanel = files.editPanel('article.pdf');
        await expect(editPanel).toBeVisible({timeout: T});
        await expect(files.editRadios('article.pdf').first()).toBeVisible();
        const offered = await files.editRadioLabels('article.pdf');
        expect(offered).toContain('Data Set');
        expect(offered).toContain('Research Results');
        expect(offered).not.toContain('Transcripts');

        // An install component renamed (Rule 15).
        let win = await list.openEdit('Other');
        await win.typeName('Other Files');
        await win.saveAndClose();
        await expect(list.row('Other Files')).toHaveCount(1, {timeout: T});
        await expect(list.row('Other')).toHaveCount(0);

        // "Restore Defaults": "Transcripts" back in its place, "Other" again,
        // "Field Notes" still listed [A1] (Rules 17c, 18).
        const restore = await list.openRestore();
        await expect(restore.question()).toHaveText(new RegExp(`^\\s*${RESTORE_QUESTION.replace(/[.?]/g, '\\$&')}\\s*$`));
        await list.confirmRestore(restore);
        await expect(list.row('Transcripts')).toHaveCount(1, {timeout: T});
        await expect(list.row('Other')).toHaveCount(1);
        await expect(list.row('Other Files')).toHaveCount(0);
        await expect(list.row('Field Notes')).toHaveCount(1);
        const restored = await list.names();
        expect(restored.indexOf('Transcripts')).toBe(restored.indexOf('Research Results') + 1);
        expect(restored.indexOf('Data Analysis')).toBe(restored.indexOf('Transcripts') + 1);
        expect([...restored].sort()).toEqual([...INSTALL_COMPONENTS, 'Field Notes'].sort());

        // Ordering cancelled: the rows back as they were, "Other" last (Rule 19).
        await list.startOrdering();
        await expect(list.dragHandles()).toHaveCount(restored.length);
        await list.drag('Other', restored[0]);
        await expect.poll(() => list.names()).not.toEqual(restored);
        await list.cancelOrdering();
        await expect.poll(() => list.names()).toEqual(restored);
        expect(restored[restored.length - 1]).toBe('Other');

        // Ordering done: "Other" first, also after a reload (Rule 19).
        await list.startOrdering();
        await list.drag('Other', restored[0]);
        await expect.poll(async () => (await list.names())[0]).toBe('Other');
        await list.done();
        await expect.poll(async () => (await list.names())[0]).toBe('Other');
        await settings.reload();
        await expect(settings.sideTab('Components')).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await list.waitLoaded();
        await expect.poll(async () => (await list.names())[0]).toBe('Other');

        // Control: "Data Set", whose delete was refused, is still listed (Rule 17a).
        await expect(list.row('Data Set')).toHaveCount(1);
    });
});
