// @ts-check
/**
 * @file playwright/tests/U45-dois.spec.js
 *
 * DOIs — OJS suite, one test per canonical scenario the spec runs on OJS
 * in the parallel `ojs` project (S1–S10 common, S12–S13 {OJS OPS},
 * S14, S16–S18 {OJS}). S11 and S15 put a journal on "DOI Versioning"
 * "Yes", which makes every OJS OAI request of the install answer 500
 * while it lasts (U19 A22), so they run in the `ojs-serial` project,
 * after this one: `tests/serial/U45-dois.spec.js`. S19 is the press's.
 * Spec: docs/specs/U45-dois.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A3 🐞: S7's refused values are read as the notice and the box back to
 *   its old value; the missing reason is not asserted.
 * - A4 🐞: after S13's "Deposit DOIs" the item's agency panel is not read.
 * - A8 🐞: rows' tick boxes are reached by their place in the row; their
 *   missing name is not asserted.
 * - A13 🐞: S13's refused export and deposit are read as nothing
 *   downloaded / nothing marked, bounded by the action's own answer; the
 *   missing message is not asserted.
 * - A14 🐞: S9 reads the "Mark DOIs Needs Sync" question up to "…previously
 *   submitted DOIs."; its "stale" sentence is not asserted.
 * - OJS3 🐞: S14 reads the ISSN publish warning as listed, never its count.
 * - A2, A7, A9–A12, A15–A20, OJS1, OJS2: not on these scenarios' paths.
 *   OMP1, OPS1–OPS5: the press's and the preprint server's.
 *
 * Seeding: scenario endpoints only; publicknowledge is read, never
 * changed (S1). Every other scenario seeds its own scratch journal with
 * throwaway accounts (the username twice as password), as footnote sc
 * says: `doiPrefix`, `doiCreationTime`, `doiSuffixType`,
 * `enabledDoiTypes`, `context.acronym`, the agency plugins with
 * `registrationAgency`, `publisherInstitution` / `onlineIssn`, `issues[]`,
 * `review.defaultReviewPublicVisibility`; works through the submission
 * scenario (`decisions[]`, `published`, `issue`, `galleys[]`,
 * `reviewRounds[]`). The DOI settings, the agency choice and the plugin
 * rows are driven on screen only where the scenario tests them. A DOI
 * typed by hand carries the run's tag after the spec's example value
 * ("10.1234/e2e-a1-{tag}"): a typed DOI must be unused on the whole
 * install (Rule 9), and the fleet's database outlives a run.
 *
 * Deposits are never drained (outbound HTTP is dead on the test installs:
 * a deposit stays "Submitted", "Export DOIs" answers 400), so no test reads
 * a status after a background job. Every absence is read settled (the
 * list's own fetch, the action's answer) and paired with a positive
 * control taken the same way (M4, M6); the mail catcher's silence is
 * bounded by a password-reset message sent to the journal's own manager
 * after the actions (A8). Waits are web-first or bounded by the screen's
 * own answer (A5).
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {ActivityLogWindow} = require('../../../../shared/playwright/pages/ActivityLogPages.js');
const {ArticleLandingPage} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');
const {SettingsPages} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');
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
    issueDoiLink,
} = require('../../../../shared/playwright/pages/DoisPages.js');
const {PublishScreen} = require('../pages/PublishSchedulePages.js');
const {PublicationScreen, publishIssue} = require('../pages/PublicationMetadataPages.js');
const {
    WorkflowPage: ReviewWorkflowPage,
    DecisionPage,
    openReviewDetails,
    markReviewComplete,
    closeReviewDetails,
} = require('../pages/ReviewStagePages.js');
const {DecisionWizardPage} = require('../pages/DecisionWizardPages.js');

const JOURNAL = 'publicknowledge';
const PREFIX = '10.1234';
const MADE = defaultDoiPattern(PREFIX);
const ARTICLE = 'Article';
const AXOLOTL = 'Axolotl limb memory';
const TARDIGRADE = 'Tardigrade desiccation';
const CORAL = 'Coral spawning';
const MOSS = 'Moss regrowth';
const ISSUE_1 = 'Vol. 1 No. 1 (2025)';
const ISSUE_1_OPTION = /Vol\. 1 No\. 1 \(2025\)/;
const ISSUE_2 = 'Vol. 1 No. 2 (2026)';
const ISSUE_2_OPTION = /Vol\. 1 No\. 2 \(2026\)/;
const GALLEYS = 'Article galleys, such as a published PDF';
const KINDS = ['Articles', 'Issues', GALLEYS, 'Peer Review'];
const CROSSREF_KINDS = ['Articles', 'Issues', 'Peer Review'];
const DATACITE_KINDS = ['Articles', 'Issues', GALLEYS];
const ENABLE_SENTENCE = 'Allow Digital Object Identifiers (DOIs) to be assigned to work published in this journal.';
const COPYEDIT = 'Upon reaching the copyediting stage';
const PUBLICATION = 'Upon publication';
const NEVER = 'Never';
const METADATA_EVENT = 'Submission metadata updated';
const TO_PRODUCTION = ['skipExternalReview', 'sendToProduction'];
const DEPOSITOR = {depositorName: 'Public Knowledge Project', depositorEmail: 'doi@mail.test'};
const PUBLISH_WARNINGS = 'The following issues were found, but will not prevent publishing';
const WARN_PUBLISHER = 'Journal publisher must be provided before submissions can be deposited with Crossref.';
const WARN_ISSN = 'Either an online ISSN or print ISSN must be provided before submissions can be deposited with Crossref.';
const WARN_NO_DOI = (title) => `The submission "${title}" is not associated with a DOI and cannot be deposited with Crossref.`;

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u45${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/**
 * Seed a scratch journal with a throwaway Journal Manager ("Mona
 * Manager") and the Authors "Ada Lovelace" and "Mary Anning", plus
 * `extra` accounts; the other keys go to the context scenario as given.
 */
async function seedJournal(ojsApi, tag, {extra = [], ...keys} = {}) {
    const users = [
        user(`${tag}mg`, 'Mona', 'Manager', ['manager']),
        user(`${tag}al`, 'Ada', 'Lovelace', ['author']),
        user(`${tag}ma`, 'Mary', 'Anning', ['author']),
        ...extra,
    ];
    const response = await ojsApi.createContext({tag, users, ...keys});
    return {manager: `${tag}mg`, ada: `${tag}al`, mary: `${tag}ma`, response};
}

/** Seed a work on the scratch journal `tag`. */
async function seedWork(ojsApi, tag, key, submitter, title, rest = {}) {
    return ojsApi.createSubmission({tag: `${tag}${key}`, context: tag, submitter, title, ...rest});
}

/** A page as `username`, every browser dialog accepted. */
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
 * A work's page signed out: its "DOI:" line reads `doi`, or (null) it has
 * none, the page's title heading being the positive control.
 */
async function expectReaderDoi(reader, tag, submissionId, doi, {version} = {}) {
    const landing = new ArticleLandingPage(reader, tag);
    await landing.goto(submissionId, version === undefined ? {} : {version});
    if (doi === null) {
        await expect(landing.title()).toBeVisible();
        await expect(readerDoiItem(reader)).toHaveCount(0);
        return;
    }
    await expect(readerDoiItem(reader).locator('h2.label')).toHaveText(/^\s*DOI:\s*$/);
    await expect(readerDoiLink(reader)).toHaveText(resolving(doi));
    await expect(readerDoiLink(reader)).toHaveAttribute('href', resolving(doi));
}

/**
 * Open a work's Publication page by address (its version's
 * "Title & Abstract", the side menu's publishing controls on top).
 */
async function openPublication(page, tag, submissionId, publicationId) {
    const screen = new PublicationScreen(page, tag);
    await screen.gotoVersionPage(submissionId, publicationId, 'titleAbstract', 'Title & Abstract');
    return screen;
}

/**
 * "Publication Settings" (U49's screen): an issue assignment radio, the
 * issue, "Save". `radio` is the assignment's label ("Assign To
 * Current/Back Issue", "Assign To Future Issue and Schedule Only").
 */
async function assignIssue(page, tag, submissionId, publicationId, radio, issueOption) {
    const frame = new WorkflowPage(page, tag);
    const screen = new PublicationScreen(page, tag);
    // The page preselects the version's assignment when its status fetch
    // answers (nothing on a journal whose only issue is a future one).
    const statusAnswer = page
        .waitForResponse((r) => r.url().includes('/issueAssignmentStatus') && r.request().method() === 'GET', {timeout: 60_000})
        .catch(() => null);
    await frame.gotoEditorial(submissionId, {menuKey: `publication_${publicationId}_issue`});
    await frame.expectPageHeading('Publication Settings');
    const choice = page.getByRole('radio', {name: radio, exact: true});
    await expect(choice).toBeVisible({timeout: 30_000});
    await screen.awaitPublishPanelSettled(page, statusAnswer);
    await choice.check();
    await screen.selectIssueOption(page, issueOption);
    await screen.save();
}

/** The publish confirmation window (publish or schedule). */
function publishWindow(page) {
    return page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|schedule) this/}).last();
}

/**
 * Press the version's "Schedule For Publication" / "Publish" and go on to
 * the confirmation window: through the "Review Publishing Details" panel
 * when it opens (its empty version boxes filled; an issue assignment the
 * version carries arrives preselected), straight when the version's
 * details were saved before (a seeded Production item). Returns the
 * window, open.
 */
async function openPublishWindow(page, tag, {issueOption = null} = {}) {
    const publish = new PublishScreen(page, tag);
    const window = publishWindow(page);
    const panel = await publish.pressPublish({or: window});
    if (panel) {
        for (const [name, value] of [['versionStage', 'VoR'], ['versionIsMinor', 'false']]) {
            const box = panel.locator(`select[name="${name}"]`);
            if ((await box.count()) > 0 && (await box.isVisible()) && !(await box.inputValue())) {
                await box.selectOption(value);
            }
        }
        if ((await publish.issueAssignmentGroup(panel).count()) > 0) {
            if (issueOption) {
                await panel.getByRole('radio', {name: 'Assign To Current/Back Issue', exact: true}).check();
                await publish.selectIssueOption(panel, issueOption);
            } else if (!(await panel.locator('select[name="issueId"]').isVisible()) || !(await panel.locator('select[name="issueId"]').inputValue())) {
                await panel.getByRole('radio', {name: "Don't Assign To An Issue", exact: true}).check();
            }
        }
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    }
    await expect(window).toBeVisible({timeout: 30_000});
    return {publish, window};
}

/** Publish the version open on the workflow (its issue assigned before, or none). */
async function publishOpenVersion(page, tag, options = {}) {
    const {publish, window} = await openPublishWindow(page, tag, options);
    await publish.confirmPublish(window, 'Publish');
    await expect(page.getByRole('button', {name: 'Unpublish', exact: true})).toBeVisible({timeout: 30_000});
}

/** The Activity Log's lines of `event`, read on the work's workflow and the window closed. */
async function activityLines(page, tag, submissionId, event = METADATA_EVENT) {
    const frame = new WorkflowPage(page, tag);
    await frame.gotoEditorial(submissionId);
    const log = new ActivityLogWindow(page, frame);
    await log.open();
    const lines = (await log.historyLines()).filter((l) => l.event === event);
    await log.close();
    return lines;
}

/**
 * The mail catcher's silence for `recipients`, bounded by a positive
 * control: a password reset for the journal's own manager, asked on the
 * journal's "Forgot your password?" page after the actions (A8). The
 * manager's inbox then holds that one message and nothing else.
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
    test('S1: who opens the DOIs page, on a journal without a prefix', async ({browser, baseURL, asUser}) => {
        test.setTimeout(240_000);
        const manager = await pageAs(asUser, 'manager.maya');
        const dois = new DoisPage(manager, JOURNAL);

        // The Journal Manager's DOIs page, from the side menu: headed "DOIs",
        // under the prefix warning; "Bulk Actions" offers no "Assign DOIs"
        // while it offers "Mark DOIs Registered" (Rules 2, 24).
        await manager.goto(`/index.php/${JOURNAL}/user/profile`);
        await expectSideMenu(manager);
        await expect(sideMenuEntry(manager, 'DOIs')).toHaveCount(1);
        await openDoisFromSideMenu(manager);
        await expect(manager).toHaveURL(new RegExp(`/index\\.php/${JOURNAL}(/en)?/dois`));
        await expect(dois.heading()).toBeVisible();
        await expect(dois.prefixWarning()).toHaveText(TEXT.prefixWarning, {useInnerText: true});
        await dois.expectListSettled();
        await dois.openBulkActions();
        await expect(dois.bulkItem('Mark DOIs Registered')).toBeVisible();
        await expect(dois.bulkItem('Assign DOIs')).toHaveCount(0);
        await dois.closeBulkActions();

        // "Add DOI prefix": Settings › Distribution › "DOIs" with the box and
        // "Articles" ticked and "DOI Prefix" empty (Rule 2); left unsaved.
        const settings = new DoiSettings(manager, JOURNAL);
        await dois.addPrefixLink().click();
        await expect(manager).toHaveURL(/\/management\/settings\/distribution#dois/);
        await settings.openSideTab('Setup');
        await expect(settings.enableBox()).toBeChecked();
        await expect(settings.kindBox('Articles')).toBeChecked();
        await expect(settings.prefixBox()).toHaveValue('');

        // The Editor: "DOIs" in the side menu; the page with "Bulk Actions"
        // and "Filters" (Actors row 2).
        const editor = await pageAs(asUser, 'editor.diana');
        await editor.goto(`/index.php/${JOURNAL}/user/profile`);
        await expectSideMenu(editor);
        await expect(sideMenuEntry(editor, 'DOIs')).toHaveCount(1);
        const editorDois = new DoisPage(editor, JOURNAL);
        await editorDois.goto();
        await expect(editorDois.bulkActionsButton()).toBeVisible();
        await expect(editorDois.filtersHeading()).toBeVisible();

        // Section Editor, Author, Reader: no "DOIs" in the side menu (its
        // other entries on screen), and the address answers the
        // access-denied page (Actors row 2).
        for (const username of ['sectioneditor.ana', 'author.alex', 'reader.rosa']) {
            const page = await pageAs(asUser, username);
            await page.goto(`/index.php/${JOURNAL}/user/profile`);
            await expectSideMenu(page);
            await expect(sideMenuEntry(page, 'Start A New Submission'), username).toHaveCount(1);
            await expect(sideMenuEntry(page, 'DOIs'), username).toHaveCount(0);
            await new DoisPage(page, JOURNAL).gotoExpectingDenied(TEXT.roleDenied);
        }

        // Signed out: the Login page (Actors row 2).
        const visitor = await readerPage(browser, baseURL);
        await new DoisPage(visitor, JOURNAL).gotoExpectingLogin();
        await visitor.context().close();

        // Control: the Journal Manager again: the page opens (Actors row 2).
        await dois.goto();
        await expect(dois.heading()).toBeVisible();
        await expect(dois.listTitle()).toHaveText('Article DOIs');
    });

    test('S2: save a DOI prefix', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s2', testInfo);
        const {manager} = await seedJournal(ojsApi, tag, {
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

    test('S3: the list: rows, search and filters', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const {manager, ada, mary} = await seedJournal(ojsApi, tag, {
            doiPrefix: PREFIX,
            doiCreationTime: 'publication',
            issues: [{volume: 1, number: 1, year: 2025, published: true}],
        });
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {published: true, issue: {volume: 1, number: 1, year: 2025}});
        const tardigrade = await seedWork(ojsApi, tag, 'ta', mary, TARDIGRADE, {decisions: ['skipExternalReview']});
        await seedWork(ojsApi, tag, 'co', mary, CORAL);
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const listed = () => dois.rowNames();
        const both = [new RegExp(`— ${TARDIGRADE}$`), new RegExp(`— ${AXOLOTL}$`)];
        const expectListed = async (patterns) => {
            await expect(dois.rowLink(dois.rows())).toHaveCount(patterns.length);
            const names = await listed();
            expect(names.length).toBe(patterns.length);
            for (const pattern of patterns) expect(names.some((n) => pattern.test(n)), String(pattern)).toBe(true);
            expect(names.some((n) => n.endsWith(CORAL)), 'Coral spawning is never listed').toBe(false);
        };

        // The page: headed "DOIs", one tab "Articles"; the list "Article
        // DOIs" with "Search" and "Bulk Actions" and no "Deposit All"; the
        // "Filters" column (Fields; Rule 14).
        await page.goto(`/index.php/${tag}/user/profile`);
        await openDoisFromSideMenu(page);
        await dois.expectListSettled();
        await expect(dois.tabs()).toHaveText(['Articles']);
        await expect(dois.tab('Issues')).toHaveCount(0);
        await expect(dois.tabHeading()).toHaveText('Articles');
        await expect(dois.listTitle()).toHaveText('Article DOIs');
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
        await expect(dois.rowLink(axRow)).toHaveAttribute('href', new RegExp(`/index\\.php/${tag}/article/view/${axolotl.submissionId}(/|$)`));
        await expect(dois.rowActions(axRow)).toContainText(String(axolotl.submissionId));
        await expect(dois.rowBadge(axRow)).toHaveText('Unregistered');
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.versionName(axRow)).toHaveText(/^\s*Version of Record 1\.0\s*$/);
        await expect(dois.columnHeaders(axRow)).toHaveText(TEXT.columns);
        expect(await dois.doiTypes(axRow)).toEqual([ARTICLE]);
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveValue(new RegExp(`^${PREFIX.replace('.', '\\.')}/`));
        await expect(dois.doiBadge(axRow, ARTICLE)).toHaveText('Unregistered');
        await expect(dois.editButton(axRow)).toHaveText('Edit');

        // An unpublished work's row (Rules 16, 17, 31).
        const taRow = dois.row(tardigrade.submissionId);
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.doiBox(taRow, ARTICLE)).toHaveValue('');
        await expect(dois.doiBadge(taRow, ARTICLE)).toHaveText('Needs DOI');

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
        await expectListed([new RegExp(`— ${AXOLOTL}$`)]);
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
        await expectListed([new RegExp(`— ${AXOLOTL}$`)]);
        await dois.clearFilter('DOI Assigned');
        await expect(dois.clearFilterButton('DOI Assigned')).toHaveCount(0);
        await expectListed(both);

        // "Registration" filters (Rule 22).
        await dois.pressFilter('Unregistered');
        await expect(dois.clearFilterButton('Unregistered')).toBeVisible();
        await expectListed([new RegExp(`— ${AXOLOTL}$`)]);
        await dois.pressFilter('Unregistered');
        await expect(dois.clearFilterButton('Unregistered')).toHaveCount(0);
        await expectListed(both);

        // The "Issues" box: "2025" suggests the issue; chosen, it keeps its
        // article (Fields, "Filters").
        const suggestions = await dois.typeInIssuesBox('2025');
        await expect(suggestions).toHaveText([ISSUE_1]);
        await dois.chooseIssueSuggestion(ISSUE_1);
        await expectListed([new RegExp(`— ${AXOLOTL}$`)]);
    });

    test('S4: DOIs made at the move to Copyediting', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const {manager, mary} = await seedJournal(ojsApi, tag, {doiPrefix: PREFIX});
        const tardigrade = await seedWork(ojsApi, tag, 'ta', mary, TARDIGRADE);
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);

        // Control: before the decision the DOIs page does not list the work
        // (Rule 15): the settled list shows its empty line.
        await dois.goto();
        await expect(dois.emptyLine()).toBeVisible();
        await expect(dois.row(tardigrade.submissionId)).toHaveCount(0);

        // The decision: "Accept and Skip Review" (Rule 5).
        const workflow = new ReviewWorkflowPage(page, tag);
        await workflow.gotoEditorial(tardigrade.submissionId);
        await workflow.frame.actionButton('Accept and Skip Review').click();
        const decision = new DecisionPage(page);
        await decision.expectOpen('Accept and Skip Review');
        await decision.completeAll();
        await workflow.frame.expectStage('Copyediting');

        // The made DOI: listed "Unpublished"; its "Article" row holds a
        // "Default" DOI reading "Unregistered" (Rules 5, 6a, 15, 16, 32).
        await dois.goto();
        const row = dois.row(tardigrade.submissionId);
        await expect(dois.rowLink(row)).toHaveText(new RegExp(`— ${TARDIGRADE}\\s*$`));
        await expect(dois.rowBadge(row)).toHaveText('Unpublished');
        await dois.expand(row, tardigrade.submissionId);
        await expect(dois.doiBox(row, ARTICLE)).toHaveValue(MADE);
        await expect(dois.doiBadge(row, ARTICLE)).toHaveText('Unregistered');
    });

    test('S5: DOIs made at publication, a galley\'s included', async ({browser, baseURL, asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const {manager, ada, mary} = await seedJournal(ojsApi, tag, {
            doiPrefix: PREFIX,
            doiCreationTime: 'publication',
            enabledDoiTypes: ['publication', 'representation'],
            issues: [{volume: 1, number: 1, year: 2025, published: true}],
        });
        const galleys = [{label: 'PDF', file: 'article.pdf'}];
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {decisions: TO_PRODUCTION, galleys});
        const tardigrade = await seedWork(ojsApi, tag, 'ta', mary, TARDIGRADE, {decisions: TO_PRODUCTION, galleys});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);

        // Before publishing: both "Unpublished"; the "Article" row empty and
        // "Needs DOI" (Rules 5, 17, 31).
        await dois.goto();
        const axRow = dois.row(axolotl.submissionId);
        const taRow = dois.row(tardigrade.submissionId);
        await expect(dois.rowBadge(axRow)).toHaveText('Unpublished');
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveValue('');
        await expect(dois.doiBadge(axRow, ARTICLE)).toHaveText('Needs DOI');

        // Published into Vol. 1 No. 1 (2025).
        await assignIssue(page, tag, axolotl.submissionId, axolotl.publicationId, 'Assign To Current/Back Issue', ISSUE_1_OPTION);
        await openPublication(page, tag, axolotl.submissionId, axolotl.publicationId);
        await publishOpenVersion(page, tag, {issueOption: ISSUE_1_OPTION});

        // The made DOIs: "Unregistered"; the "Article" and "PDF" rows each
        // a "Default" DOI, the two different (Rules 5, 6a, 17, 31).
        await dois.goto();
        await expect(dois.rowBadge(axRow)).toHaveText('Unregistered');
        await dois.expand(axRow, axolotl.submissionId);
        expect(await dois.doiTypes(axRow)).toEqual([ARTICLE, 'PDF']);
        const articleDoi = await doiValue(dois.doiBox(axRow, ARTICLE));
        const galleyDoi = await doiValue(dois.doiBox(axRow, 'PDF'));
        expect(galleyDoi).not.toBe(articleDoi);
        await expect(dois.doiBadge(axRow, ARTICLE)).toHaveText('Unregistered');
        await expect(dois.doiBadge(axRow, 'PDF')).toHaveText('Unregistered');

        // The reader's page: "DOI:" with the article's DOI as a link
        // (Rule 43; Actors row 4).
        const reader = await readerPage(browser, baseURL);
        await expectReaderDoi(reader, tag, axolotl.submissionId, articleDoi);
        await reader.context().close();

        // Control: the unpublished work still reads "Needs DOI" (Rule 5).
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.doiBox(taRow, ARTICLE)).toHaveValue('');
        await expect(dois.doiBadge(taRow, ARTICLE)).toHaveText('Needs DOI');
    });

    test('S6: "Never", then "Assign DOIs"; DOIs switched off', async ({browser, baseURL, asUser, ojsApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const {manager, ada, mary} = await seedJournal(ojsApi, tag, {doiPrefix: PREFIX, doiCreationTime: 'never'});
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedWork(ojsApi, tag, 'ta', mary, TARDIGRADE, {published: true});
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
        await expectReaderDoi(reader, tag, axolotl.submissionId, null);

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
        const axDoi = await doiValue(dois.doiBox(axRow, ARTICLE));
        await expect(dois.doiBadge(axRow, ARTICLE)).toHaveText('Unregistered');

        // One already carrying a DOI keeps it; the other gets its own
        // (Rule 25).
        await dois.runBulk('Assign DOIs', [axolotl.submissionId, tardigrade.submissionId]);
        await dois.expand(axRow, axolotl.submissionId);
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveValue(axDoi);
        const taDoi = await doiValue(dois.doiBox(taRow, ARTICLE));
        expect(taDoi).not.toBe(axDoi);

        // The Activity Log: one more "Submission metadata updated" under the
        // Journal Manager's name (Side effects).
        const logAfter = await activityLines(page, tag, axolotl.submissionId);
        expect(logAfter.length).toBe(logBefore + 1);
        expect(logAfter.map((l) => l.user)).toContain('Mona Manager');

        // The reader's page shows the DOI (Rules 10, 43).
        await expectReaderDoi(reader, tag, axolotl.submissionId, axDoi);

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
        await expectReaderDoi(reader, tag, axolotl.submissionId, axDoi);

        // Every kind unticked: the same (Rule 1; Settings bullet 2).
        await settings.goto('Setup');
        await settings.enableBox().check();
        await settings.kindBox('Articles').uncheck();
        await settings.save(settings.setup);
        await settings.goto('Setup');
        await expect(settings.enableBox()).toBeChecked();
        await expect(settings.kindBox('Articles')).not.toBeChecked();
        await page.goto(`/index.php/${tag}/user/profile`);
        await expectSideMenu(page);
        await expect(sideMenuEntry(page, 'Settings')).toHaveCount(1);
        await expect(sideMenuEntry(page, 'DOIs')).toHaveCount(0);
        await dois.gotoExpectingDenied(TEXT.doisOff);

        // No email about the DOIs (Side effects), bounded by the control.
        await expectNoMailBesidesControl(browser, baseURL, pkpMail, tag, manager, [`${tag}al`, `${tag}ma`]);
        await reader.context().close();
    });

    test('S7: type, change and clear a DOI by hand', async ({browser, baseURL, asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const {manager, ada, mary} = await seedJournal(ojsApi, tag, {doiPrefix: PREFIX, doiCreationTime: 'never', doiSuffixType: 'none'});
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedWork(ojsApi, tag, 'ta', mary, TARDIGRADE, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);
        const reader = await readerPage(browser, baseURL);
        const first = `${PREFIX}/e2e-a1-${tag}`;
        const second = `${PREFIX}/e2e-a2-${tag}`;
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
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveJSProperty('readOnly', true);
        await dois.startEditing(axRow);
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveJSProperty('readOnly', false);
        await dois.doiBox(axRow, ARTICLE).fill(first);
        await dois.saveEditing(axRow);
        await dois.expectNotice(TEXT.updated);
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveValue(first);
        await expect(dois.doiBadge(axRow, ARTICLE)).toHaveText('Unregistered');

        // The other side: the reader's line; one more Activity Log line
        // (Rules 10, 43; Side effects).
        await expectReaderDoi(reader, tag, axolotl.submissionId, first);
        const logTyped = (await activityLines(page, tag, axolotl.submissionId)).length;
        expect(logTyped).toBe(logBefore + 1);

        // Refused values: each leaves the box empty again and the row "Needs
        // DOI" (Fields, a DOI box; Rules 9, 18).
        await dois.goto();
        const taRow = dois.row(tardigrade.submissionId);
        await dois.expand(taRow, tardigrade.submissionId);
        for (const value of ['abc', `${PREFIX}/a b`, first]) {
            await dois.startEditing(taRow);
            await dois.doiBox(taRow, ARTICLE).fill(value);
            const statuses = await dois.saveEditing(taRow);
            expect(statuses.every((s) => s >= 400), `${value} refused (${statuses})`).toBe(true);
            await dois.expectNotice(TEXT.partialFailure);
            await expect(dois.doiBox(taRow, ARTICLE)).toHaveValue('');
            await expect(dois.doiBadge(taRow, ARTICLE)).toHaveText('Needs DOI');
        }

        // Changed: the reader's line follows; no Activity Log line
        // (Rules 10, 18; Side effects).
        await dois.expand(axRow, axolotl.submissionId);
        await dois.startEditing(axRow);
        await dois.doiBox(axRow, ARTICLE).fill(second);
        await dois.saveEditing(axRow);
        await dois.expectNotice(TEXT.updated);
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveValue(second);
        await expectReaderDoi(reader, tag, axolotl.submissionId, second);
        expect((await activityLines(page, tag, axolotl.submissionId)).length).toBe(logTyped);

        // Cleared: "Needs DOI" again, no reader line (Rules 10, 18, 43).
        await dois.goto();
        await dois.expand(axRow, axolotl.submissionId);
        await dois.startEditing(axRow);
        await dois.doiBox(axRow, ARTICLE).fill('');
        await dois.saveEditing(axRow);
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveValue('');
        await expect(dois.doiBadge(axRow, ARTICLE)).toHaveText('Needs DOI');
        await expectReaderDoi(reader, tag, axolotl.submissionId, null);

        // Control: "Edit", then "Save" with nothing changed closes the
        // editing and sends nothing (Rule 18).
        await dois.expand(taRow, tardigrade.submissionId);
        await dois.startEditing(taRow);
        const statuses = await dois.saveEditing(taRow, {expectRequests: false});
        expect(statuses).toEqual([]);
        await expect(dois.doiBox(taRow, ARTICLE)).toHaveJSProperty('readOnly', true);
        await reader.context().close();
    });

    test('S8: a custom suffix pattern', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s8', testInfo);
        const {manager, ada, mary} = await seedJournal(ojsApi, tag, {
            context: {acronym: 'JPK'},
            doiPrefix: PREFIX,
            doiCreationTime: 'never',
            issues: [{volume: 1, number: 1, year: 2025, published: true}],
        });
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedWork(ojsApi, tag, 'ta', mary, TARDIGRADE, {published: true, issue: {volume: 1, number: 1, year: 2025}});
        const coral = await seedWork(ojsApi, tag, 'co', mary, CORAL, {decisions: TO_PRODUCTION});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);

        // Control: before "Custom pattern", no pattern group (Fields).
        await settings.goto('Setup');
        await expect(settings.formatRadio('Default')).toBeChecked();
        await expect(settings.patternGroup()).toHaveCount(0);

        // The pattern group (Fields).
        await settings.formatRadio('Custom pattern - (not recommended)').check();
        await expect(settings.patternGroup()).toBeVisible();
        await expect(settings.patternGroup()).toContainText(TEXT.patternHelpOpening);
        await expect(settings.patternGroup().getByRole('textbox')).toHaveCount(3);
        for (const label of ['Submissions', 'Article Galleys', 'Issues']) {
            await expect(settings.patternBox(label)).toBeVisible();
        }
        await expect(settings.patternGroup()).toContainText(`Peer Review ${TEXT.patternNotSupported}`, {useInnerText: false});

        // An empty box refused under "Submissions" (Fields).
        await settings.saveRefused(settings.setup, settings.patternBox('Submissions'), TEXT.patternRequired);

        // Saved (Fields).
        await settings.patternBox('Submissions').fill('%j.%a');
        await settings.save(settings.setup);

        // The made DOI: "10.1234/jpk.{its number}" (Rules 6c, 16, 25).
        await dois.goto();
        await dois.runBulk('Assign DOIs', [axolotl.submissionId]);
        await dois.expectNotice(TEXT.assigned);
        const axRow = dois.row(axolotl.submissionId);
        await expect(dois.rowActions(axRow)).toContainText(String(axolotl.submissionId));
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveValue(`${PREFIX}/jpk.${axolotl.submissionId}`);

        // A pattern that needs an issue (Rules 6c, 25).
        await settings.goto('Setup');
        await settings.patternBox('Submissions').fill('%j.v%vi%i.%a');
        await settings.save(settings.setup);
        await dois.goto();
        await dois.runBulk('Assign DOIs', [tardigrade.submissionId, coral.submissionId]);
        await expect(dois.failedDialog()).toBeVisible();
        await expect(dois.failedDialog()).toContainText(TEXT.partialFailure);
        await expect(dois.failedDialog()).toContainText(
            `Could not create a DOI for the following submission: ${CORAL}. The submission must be assigned to an issue before a DOI can be generated.`
        );
        await expect(dois.failedDialog()).not.toContainText(TARDIGRADE);
        await dois.closeFailedDialog();
        const taRow = dois.row(tardigrade.submissionId);
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.doiBox(taRow, ARTICLE)).toHaveValue(`${PREFIX}/jpk.v1i1.${tardigrade.submissionId}`);
        const coRow = dois.row(coral.submissionId);
        await dois.expand(coRow, coral.submissionId);
        await expect(dois.doiBox(coRow, ARTICLE)).toHaveValue('');
    });

    test('S9: mark statuses by hand; "Needs Sync" after unpublishing', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s9', testInfo);
        const {manager, ada, mary} = await seedJournal(ojsApi, tag, {doiPrefix: PREFIX});
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedWork(ojsApi, tag, 'ta', mary, TARDIGRADE, {decisions: TO_PRODUCTION});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const axRow = dois.row(axolotl.submissionId);
        const taRow = dois.row(tardigrade.submissionId);
        const expectAxolotl = async (badge, row) => {
            await expect(dois.rowBadge(axRow)).toHaveText(badge);
            await dois.expand(axRow, axolotl.submissionId);
            await expect(dois.doiBadge(axRow, ARTICLE)).toHaveText(row);
        };

        await dois.goto();
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
        const screen = await openPublication(page, tag, axolotl.submissionId, axolotl.publicationId);
        await screen.unpublish();
        await dois.goto();
        await expectAxolotl('Unpublished', 'Needs Sync');
        await expect(dois.editButton(axRow)).toBeEnabled();

        // Published again: still "Needs Sync" (Rule 32).
        await openPublication(page, tag, axolotl.submissionId, axolotl.publicationId);
        await publishOpenVersion(page, tag);
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

        // Control: the unpublished work read "Unpublished" throughout (Rule 16).
        await expect(dois.rowBadge(taRow)).toHaveText('Unpublished');
    });

    test('S10: one DOI for every version ("DOI Versioning" "No")', async ({browser, baseURL, asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s10', testInfo);
        const {manager, ada} = await seedJournal(ojsApi, tag, {doiPrefix: PREFIX, doiVersioning: false});
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const reader = await readerPage(browser, baseURL);
        const changed = `${PREFIX}/e2e-v1-${tag}`;
        const row = dois.row(axolotl.submissionId);

        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        const firstDoi = await doiValue(dois.doiBox(row, ARTICLE));

        // A new version: the expanded view still shows the published
        // version and its DOI (Rule 17).
        const screen = await openPublication(page, tag, axolotl.submissionId, axolotl.publicationId);
        const publish = new PublishScreen(page, tag);
        const dialog = await publish.openCreateVersionDialog();
        const newPublicationId = await publish.confirmVersionDialog(dialog);
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.versionName(row)).toHaveText(/^\s*Version of Record 1\.0\s*$/);
        await expect(dois.doiBox(row, ARTICLE)).toHaveValue(firstDoi);
        await expect(dois.versionsBar(row)).toHaveCount(0);

        // The new version published: the same "DOI:" line (Rules 11, 43).
        await screen.gotoVersionPage(axolotl.submissionId, newPublicationId, 'titleAbstract', 'Title & Abstract');
        await publishOpenVersion(page, tag);
        await expectReaderDoi(reader, tag, axolotl.submissionId, firstDoi);

        // Control: before the change, the older version's page shows the
        // first DOI (Rules 11, 43).
        await expectReaderDoi(reader, tag, axolotl.submissionId, firstDoi, {version: axolotl.publicationId});

        // Changed for every version (Rules 11, 43).
        await dois.goto();
        await dois.expand(row, axolotl.submissionId);
        await dois.startEditing(row);
        await dois.doiBox(row, ARTICLE).fill(changed);
        await dois.saveEditing(row);
        await dois.expectNotice(TEXT.updated);
        await expectReaderDoi(reader, tag, axolotl.submissionId, changed);
        await expectReaderDoi(reader, tag, axolotl.submissionId, changed, {version: axolotl.publicationId});
        await reader.context().close();
    });

    test('S12: choose a registration agency', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s12', testInfo);
        const {manager, ada} = await seedJournal(ojsApi, tag, {
            doiPrefix: PREFIX,
            enabledDoiTypes: ['publication', 'representation'],
            publisherInstitution: 'Public Knowledge Project',
            onlineIssn: '1234-5679',
        });
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {published: true, galleys: [{label: 'PDF', file: 'article.pdf'}]});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);
        const row = dois.row(axolotl.submissionId);

        // Control: before Crossref is saved, the "Setup" tab lists the galley
        // box ticked and the expanded view has the "PDF" row (Rules 4, 35).
        await settings.goto('Setup');
        expect(await settings.kinds()).toEqual(KINDS.map((label) => ({label, checked: label === 'Articles' || label === GALLEYS})));
        await dois.goto();
        await expect(dois.depositAllButton()).toHaveCount(0);
        await dois.expand(row, axolotl.submissionId);
        expect(await dois.doiTypes(row)).toEqual([ARTICLE, 'PDF']);
        await expect(dois.doiBox(row, 'PDF')).toHaveValue(MADE);

        // No agency plugin: the text and "Save" alone; "Saved" (Fields;
        // Settings bullet 11).
        await settings.goto('Registration');
        await expect(settings.registration).toContainText(TEXT.noAgency);
        await expect(settings.registration).toContainText(TEXT.noAgencyHelp);
        await expect(settings.agencySelect()).toHaveCount(0);
        await expect(settings.registration.locator('input:visible, select:visible, textarea:visible')).toHaveCount(0);
        await expect(settings.registration.getByRole('button')).toHaveText(['Save']);
        await settings.save(settings.registration);

        // The plugin enabled: "Registration Agency" with an empty box,
        // offering "None" and "Crossref" (Fields; Rule 34).
        await settings.gotoPlugins('crossrefplugin');
        await settings.setPluginEnabled('crossrefplugin', true);
        await settings.goto('Registration');
        expect(await settings.agencyState()).toEqual({value: '', options: expect.arrayContaining(['None', 'Crossref'])});
        expect((await settings.agencyState()).options.filter(Boolean)).toEqual(['None', 'Crossref']);
        await expect(settings.registrationText(TEXT.noAgency)).toHaveCount(0);

        // Crossref chosen: its block at once; typed and saved (Fields; Rule 35).
        await expect(settings.field('depositorName')).toHaveCount(0);
        await settings.chooseAgency('Crossref');
        await expect(settings.registrationText('Crossref Settings')).toBeVisible();
        await expect(settings.field('depositorName')).toBeVisible();
        await expect(settings.field('depositorEmail')).toBeVisible();
        await expect(settings.automaticDepositBox()).not.toBeChecked();
        await settings.field('depositorName').fill(DEPOSITOR.depositorName);
        await settings.field('depositorEmail').fill(DEPOSITOR.depositorEmail);
        await settings.save(settings.registration);

        // The "Setup" tab: only Crossref's kinds, "Articles" ticked, the
        // galley box gone (Rule 35; A6).
        await settings.goto('Setup');
        expect(await settings.kinds()).toEqual(CROSSREF_KINDS.map((label) => ({label, checked: label === 'Articles'})));
        await expect(settings.kindBox(GALLEYS)).toHaveCount(0);

        // The DOIs page: no "PDF" row; "Deposit All" (Rules 4, 36).
        await dois.goto();
        await expect(dois.depositAllButton()).toBeVisible();
        await dois.expand(row, axolotl.submissionId);
        expect(await dois.doiTypes(row)).toEqual([ARTICLE]);

        // The plugin disabled: "No Registration Agency Enabled"; no "Deposit
        // All" (Rules 34, 36).
        await settings.gotoPlugins('crossrefplugin');
        await settings.setPluginEnabled('crossrefplugin', false);
        await settings.goto('Registration');
        await expect(settings.registration).toContainText(TEXT.noAgency);
        await expect(settings.agencySelect()).toHaveCount(0);
        await dois.goto();
        await expect(dois.bulkActionsButton()).toBeVisible();
        await expect(dois.depositAllButton()).toHaveCount(0);

        // The plugin enabled again: an empty box; Crossref chosen, its saved
        // fields back; the "Setup" tab lists every kind again, the galley
        // box unticked (Rule 34).
        await settings.gotoPlugins('crossrefplugin');
        await settings.setPluginEnabled('crossrefplugin', true);
        await settings.goto('Registration');
        expect((await settings.agencyState()).value).toBe('');
        await settings.chooseAgency('Crossref');
        await expect(settings.field('depositorName')).toHaveValue(DEPOSITOR.depositorName);
        await expect(settings.field('depositorEmail')).toHaveValue(DEPOSITOR.depositorEmail);
        await settings.goto('Setup');
        expect(await settings.kinds()).toEqual(KINDS.map((label) => ({label, checked: label === 'Articles'})));
    });

    test('S13: deposit DOIs with Crossref', async ({browser, baseURL, asUser, ojsApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s13', testInfo);
        const {manager, ada, mary} = await seedJournal(ojsApi, tag, {
            doiPrefix: PREFIX,
            plugins: {crossrefplugin: {enabled: true, settings: DEPOSITOR}},
            registrationAgency: 'crossrefplugin',
            publisherInstitution: 'Public Knowledge Project',
            onlineIssn: '1234-5679',
        });
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const tardigrade = await seedWork(ojsApi, tag, 'ta', mary, TARDIGRADE, {published: true});
        const coral = await seedWork(ojsApi, tag, 'co', mary, CORAL, {published: true});
        const moss = await seedWork(ojsApi, tag, 'mo', ada, MOSS, {decisions: TO_PRODUCTION});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const axRow = dois.row(axolotl.submissionId);
        const taRow = dois.row(tardigrade.submissionId);
        const coRow = dois.row(coral.submissionId);
        const moRow = dois.row(moss.submissionId);

        // What the page offers (Rules 24, 36).
        await dois.goto();
        await expect(dois.depositAllButton()).toBeVisible();
        expect(await dois.bulkLabels()).toEqual([
            'Select All',
            'Expand all',
            'Export DOIs',
            'Mark DOIs Registered',
            'Mark DOIs Unregistered',
            'Mark DOIs Needs Sync',
            'Assign DOIs',
            'Deposit DOIs',
        ]);
        await dois.closeBulkActions();
        for (const r of [axRow, taRow, coRow]) await expect(dois.rowBadge(r)).toHaveText('Unregistered');

        // The agency panel (Rule 30).
        await dois.expand(moRow, moss.submissionId);
        await expect(dois.agencyName(moRow)).toHaveText('Crossref');
        await expect(dois.agencySentence(moRow)).toHaveText(TEXT.notPublished);
        await expect(dois.agencyButtons(moRow)).toHaveCount(0);
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.agencyName(axRow)).toHaveText('Crossref');
        await expect(dois.agencySentence(axRow)).toHaveText(TEXT.notSubmitted('Crossref'));
        await expect(dois.agencyButtons(axRow)).toHaveText(['Deposit DOI(s)']);

        // Registered by hand: "manually registered", no button (Rule 30).
        await dois.runBulk('Mark DOIs Registered', [tardigrade.submissionId]);
        await expect(dois.rowBadge(taRow)).toHaveText('Registered');
        await dois.expand(taRow, tardigrade.submissionId);
        await expect(dois.agencySentence(taRow)).toHaveText(TEXT.manuallyRegistered);
        await expect(dois.agencyButtons(taRow)).toHaveCount(0);

        // "Export DOIs" with an unpublished work: the question; nothing
        // downloads (Rule 29; A13 not asserted).
        /** @type {string[]} */
        const downloads = [];
        page.on('download', (d) => downloads.push(d.suggestedFilename()));
        await dois.tick([axolotl.submissionId, moss.submissionId]);
        const exporting = await dois.chooseBulkAction('Export DOIs');
        await expect(exporting).toContainText(TEXT.exportQuestion(2, 'Crossref'));
        const exported = await dois.confirmAction(exporting, 'Export DOIs');
        expect(exported.status(), 'the export is refused').toBe(400);
        expect(exported.headers()['content-disposition'] || '').not.toContain('attachment');
        expect(downloads).toEqual([]);

        // "Deposit DOIs" with an unpublished work: the question; nothing
        // marked (Rule 29; A13 not asserted).
        await dois.tick([axolotl.submissionId, moss.submissionId]);
        const depositing = await dois.chooseBulkAction('Deposit DOIs');
        await expect(depositing).toContainText(TEXT.depositQuestion(2, 'Crossref'));
        const refused = await dois.confirmAction(depositing, 'Deposit DOIs');
        expect(refused.status(), 'the deposit is refused').toBe(400);
        await expect(dois.rowBadge(axRow)).toHaveText('Unregistered');
        await expect(dois.rowBadge(moRow)).toHaveText('Unpublished');

        // "Deposit DOIs": "Submitted" at once, "Edit" greyed (Rules 19, 29,
        // 32; A4 not asserted).
        const deposited = await dois.runBulk('Deposit DOIs', [axolotl.submissionId]);
        expect(deposited.status()).toBe(200);
        await dois.expectNotice(TEXT.depositQueued);
        await expect(dois.rowBadge(axRow)).toHaveText('Submitted');
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBadge(axRow, ARTICLE)).toHaveText('Submitted');
        await expect(dois.editButton(axRow)).toBeDisabled();

        // "Deposit All" (Rule 29).
        await expect(dois.rowBadge(coRow)).toHaveText('Unregistered');
        await dois.depositAllButton().click();
        const all = dois.dialog(TEXT.depositAllTitle);
        await expect(all).toBeVisible();
        await expect(all).toContainText(TEXT.depositAllQuestion('Crossref'));
        await expect(all.getByRole('button', {name: TEXT.depositAllTitle, exact: true})).toBeVisible();
        await expect(all.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        const depositedAll = await dois.confirmAction(all, TEXT.depositAllTitle);
        expect(depositedAll.status()).toBe(200);
        await dois.expectNotice(TEXT.depositQueued);
        await expect(dois.rowBadge(coRow)).toHaveText('Submitted');

        // Control: "Registered" and "Unpublished" untouched (Rules 16, 29).
        await expect(dois.rowBadge(taRow)).toHaveText('Registered');
        await expect(dois.rowBadge(moRow)).toHaveText('Unpublished');

        // No mail about the deposits (Side effects), bounded by the control.
        await expectNoMailBesidesControl(browser, baseURL, pkpMail, tag, manager, [`${tag}al`, `${tag}ma`]);
    });

    test('S14: Crossref\'s requirements on a journal', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s14', testInfo);
        // The Masthead refuses its first "Save" without "Journal initials"
        // and a "Country" (scenarios.md, `context.country`).
        const {manager, ada} = await seedJournal(ojsApi, tag, {
            context: {acronym: 'JPK', country: 'CA'},
            doiPrefix: PREFIX,
            doiCreationTime: 'never',
            plugins: {crossrefplugin: {enabled: true, settings: DEPOSITOR}},
            registrationAgency: 'crossrefplugin',
            issues: [{volume: 1, number: 1, year: 2025, published: true}],
        });
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {decisions: TO_PRODUCTION});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);
        const row = dois.row(axolotl.submissionId);

        // The notice; "Save" still "Saved" (Rule 37).
        await settings.goto('Registration');
        await expect(settings.registrationText('Crossref Settings')).toBeVisible();
        await expect(settings.registration).toContainText(TEXT.requirementsHeading);
        await expect(settings.registration).toContainText(TEXT.publisherMissing);
        await expect(settings.registration).toContainText(TEXT.issnMissing);
        await settings.save(settings.registration);

        // Control, and not configured: no "Deposit All", no "Export DOIs" or
        // "Deposit DOIs", no agency box (Rule 36).
        await dois.goto();
        await expect(dois.bulkActionsButton()).toBeVisible();
        await expect(dois.depositAllButton()).toHaveCount(0);
        await dois.openBulkActions();
        await expect(dois.bulkItem('Mark DOIs Registered')).toBeVisible();
        await expect(dois.bulkItem('Export DOIs')).toHaveCount(0);
        await expect(dois.bulkItem('Deposit DOIs')).toHaveCount(0);
        await dois.closeBulkActions();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.editButton(row)).toBeVisible();
        await expect(dois.agencyPanel(row)).toHaveCount(0);

        // The publish warnings (Rule 39; OJS3 read as listed, never counted).
        await openPublication(page, tag, axolotl.submissionId, axolotl.publicationId);
        let opened = await openPublishWindow(page, tag, {issueOption: ISSUE_1_OPTION});
        await expect(opened.window).toContainText(PUBLISH_WARNINGS);
        await expect(opened.window).toContainText(WARN_PUBLISHER);
        await expect(opened.window).toContainText(WARN_ISSN);
        await expect(opened.window).toContainText(WARN_NO_DOI(AXOLOTL));

        // "Publisher" and an ISSN saved: no notice; the page configured
        // (Rules 36, 37; Settings bullet 13).
        const journal = new SettingsPages(page, tag);
        const masthead = await journal.openJournalTab('Masthead');
        await masthead.control('masthead-publisherInstitution-control').fill('Public Knowledge Project');
        await masthead.control('masthead-onlineIssn-control').fill('1234-5679');
        await masthead.save();
        await settings.goto('Registration');
        await expect(settings.registrationText('Crossref Settings')).toBeVisible();
        await expect(settings.registration).not.toContainText(TEXT.requirementsHeading);
        await dois.goto();
        await expect(dois.depositAllButton()).toBeVisible();
        await dois.openBulkActions();
        await expect(dois.bulkItem('Export DOIs')).toBeVisible();
        await expect(dois.bulkItem('Deposit DOIs')).toBeVisible();
        await dois.closeBulkActions();

        // With a DOI: the line about the missing DOI gone; published into Vol.
        // 1 No. 1 (2025), "Unregistered" (Rules 16, 31, 39).
        await dois.runBulk('Assign DOIs', [axolotl.submissionId]);
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.doiBox(row, ARTICLE)).toHaveValue(MADE);
        await assignIssue(page, tag, axolotl.submissionId, axolotl.publicationId, 'Assign To Current/Back Issue', ISSUE_1_OPTION);
        await openPublication(page, tag, axolotl.submissionId, axolotl.publicationId);
        opened = await openPublishWindow(page, tag, {issueOption: ISSUE_1_OPTION});
        await expect(opened.window).toContainText('Are you sure you want to publish this?');
        await expect(opened.window).not.toContainText(WARN_NO_DOI(AXOLOTL));
        await opened.publish.confirmPublish(opened.window, 'Publish');
        await expect(page.getByRole('button', {name: 'Unpublish', exact: true})).toBeVisible({timeout: 30_000});
        await dois.goto();
        await expect(dois.rowBadge(row)).toHaveText('Unregistered');
    });

    test('S16: DataCite', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s16', testInfo);
        const {manager, ada} = await seedJournal(ojsApi, tag, {
            doiPrefix: PREFIX,
            plugins: {dataciteplugin: {enabled: true}},
        });
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {published: true});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const settings = new DoiSettings(page, tag);
        const row = dois.row(axolotl.submissionId);

        // Control: before DataCite is saved, no "Deposit All" (Rule 36).
        await dois.goto();
        await expect(dois.bulkActionsButton()).toBeVisible();
        await expect(dois.depositAllButton()).toHaveCount(0);

        // DataCite chosen: its block (Fields, the DataCite block).
        await settings.goto('Registration');
        expect((await settings.agencyState()).value).toBe('');
        await settings.chooseAgency('DataCite');
        await expect(settings.registrationText('DataCite Settings')).toBeVisible();
        await expect(settings.registration).toContainText(TEXT.dataciteIntro);
        for (const name of ['username', 'password', 'testUsername', 'testPassword', 'testDOIPrefix']) {
            await expect(settings.field(name), name).toBeVisible();
        }
        await expect(settings.testingBox('Use the DataCite test system')).toBeVisible();

        // "Testing" without a test prefix refused; then saved (Fields; A5).
        await settings.testingBox('Use the DataCite test system').check();
        await settings.saveRefused(settings.registration, settings.field('testDOIPrefix'), TEXT.testDoiPrefixRequired);
        await settings.field('testDOIPrefix').fill('10.5072');
        await settings.save(settings.registration);

        // The "Setup" tab: DataCite's kinds, no "Peer Review" (Rule 35).
        await settings.goto('Setup');
        expect((await settings.kinds()).map((k) => k.label)).toEqual(DATACITE_KINDS);
        await expect(settings.kindBox('Peer Review')).toHaveCount(0);

        // The DOIs page: "Deposit All", the agency's actions and panel
        // (Rules 30, 36).
        await dois.goto();
        await expect(dois.depositAllButton()).toBeVisible();
        await dois.openBulkActions();
        await expect(dois.bulkItem('Export DOIs')).toBeVisible();
        await expect(dois.bulkItem('Deposit DOIs')).toBeVisible();
        await dois.closeBulkActions();
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.agencyName(row)).toHaveText('DataCite');
        await expect(dois.agencySentence(row)).toHaveText(TEXT.notSubmitted('DataCite'));
        await expect(dois.agencyButtons(row)).toHaveText(['Deposit DOI(s)']);

        // "Deposit DOI(s)": the window for this item; "Submitted" (Rules 29, 30).
        await dois.agencyButtons(row).click();
        const deposit = dois.dialog('Deposit DOIs');
        await expect(deposit).toBeVisible();
        await expect(deposit).toContainText(TEXT.depositQuestion(1, 'DataCite'));
        const deposited = await dois.confirmAction(deposit, 'Deposit DOIs');
        expect(deposited.status()).toBe(200);
        await dois.expectNotice(TEXT.depositQueued);
        await dois.expand(row, axolotl.submissionId);
        await expect(dois.doiBadge(row, ARTICLE)).toHaveText('Submitted');
    });

    test('S17: peer-review DOIs', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s17', testInfo);
        const reviewer = `${tag}rv`;
        const {manager, ada, mary} = await seedJournal(ojsApi, tag, {
            doiPrefix: PREFIX,
            enabledDoiTypes: ['publication', 'peerReview'],
            review: {defaultReviewPublicVisibility: true},
            extra: [user(reviewer, 'Rhea', 'Reviewer', ['externalReviewer'])],
        });
        const inReview = {decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: reviewer, status: 'completed'}]}]};
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, inReview);
        const tardigrade = await seedWork(ojsApi, tag, 'ta', mary, TARDIGRADE, inReview);
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const workflow = new ReviewWorkflowPage(page, tag);
        const wizard = new DecisionWizardPage(page);
        const peerReview = /^Peer Review \d+$/;

        // Control: before either decision, the DOIs page lists neither work
        // (Rule 15): its settled list shows the empty line.
        await dois.goto();
        await expect(dois.emptyLine()).toBeVisible();
        await expect(dois.rows()).toHaveCount(0);

        // Accept with the reviewers notified: "Reviewer Thanked"; an
        // "Article" row and a "Peer Review {number}" row, each with its own
        // DOI, "Unregistered" (Rule 7).
        await workflow.gotoEditorial(axolotl.submissionId);
        await workflow.frame.actionButton('Accept Submission').click();
        await wizard.expectTitle('Accept Submission: Notify Authors');
        await wizard.continueStep();
        await wizard.expectTitle('Accept Submission: Notify Reviewers');
        await wizard.continueStep();
        await wizard.expectTitle('Accept Submission: Select Files');
        await wizard.recordDecision('Submission Accepted');
        await wizard.viewSubmissionSummary();
        await workflow.frame.expectOpen(axolotl.submissionId);
        await workflow.frame.selectRound(1);
        await expect(workflow.reviewerRow('Rhea Reviewer')).toContainText('Reviewer Thanked', {timeout: 30_000});
        await dois.goto();
        const axRow = dois.row(axolotl.submissionId);
        await dois.expand(axRow, axolotl.submissionId);
        const axTypes = await dois.doiTypes(axRow);
        expect(axTypes.length).toBe(2);
        expect(axTypes[0]).toBe(ARTICLE);
        expect(axTypes[1]).toMatch(peerReview);
        const articleDoi = await doiValue(dois.doiBox(axRow, ARTICLE), new RegExp(`^${PREFIX.replace('.', '\\.')}/.+`));
        const reviewDoi = await doiValue(dois.doiBox(axRow, axTypes[1]), new RegExp(`^${PREFIX.replace('.', '\\.')}/.+`));
        expect(reviewDoi).not.toBe(articleDoi);
        await expect(dois.doiBadge(axRow, ARTICLE)).toHaveText('Unregistered');
        await expect(dois.doiBadge(axRow, axTypes[1])).toHaveText('Unregistered');

        // Accept without the reviewers' email: the "Article" row only (Rule 7).
        await workflow.gotoEditorial(tardigrade.submissionId);
        await workflow.frame.actionButton('Accept Submission').click();
        await wizard.expectTitle('Accept Submission: Notify Authors');
        await wizard.continueStep();
        await wizard.expectTitle('Accept Submission: Notify Reviewers');
        await wizard.skipEmail();
        await wizard.expectTitle('Accept Submission: Select Files');
        await wizard.recordDecision('Submission Accepted');
        await wizard.viewSubmissionSummary();
        await workflow.frame.expectOpen(tardigrade.submissionId);
        await dois.goto();
        const taRow = dois.row(tardigrade.submissionId);
        await dois.expand(taRow, tardigrade.submissionId);
        expect(await dois.doiTypes(taRow)).toEqual([ARTICLE]);

        // "Mark as Complete": the "Peer Review {number}" row with its DOI (Rule 7).
        await workflow.gotoEditorial(tardigrade.submissionId);
        await workflow.frame.selectRound(1);
        const modal = await openReviewDetails(page, workflow.reviewerRow('Rhea Reviewer'));
        await markReviewComplete(page, modal);
        await closeReviewDetails(page, modal);
        await dois.goto();
        await dois.expand(taRow, tardigrade.submissionId);
        const taTypes = await dois.doiTypes(taRow);
        expect(taTypes.length).toBe(2);
        expect(taTypes[1]).toMatch(peerReview);
        await expect(dois.doiBox(taRow, taTypes[1])).toHaveValue(new RegExp(`^${PREFIX.replace('.', '\\.')}/.+`));
    });

    test('S18: issue DOIs, and an article scheduled under "Upon publication"', async ({browser, baseURL, asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s18', testInfo);
        const {manager, ada, response} = await seedJournal(ojsApi, tag, {
            doiPrefix: PREFIX,
            enabledDoiTypes: ['publication', 'issue'],
            doiCreationTime: 'publication',
            issues: [{volume: 1, number: 2, year: 2026}],
        });
        const issueId = response.issues[0].id;
        const axolotl = await seedWork(ojsApi, tag, 'ax', ada, AXOLOTL, {decisions: TO_PRODUCTION});
        const page = await pageAs(asUser, manager);
        const dois = new DoisPage(page, tag);
        const axRow = dois.row(axolotl.submissionId);
        const issueRow = dois.row(issueId, 'issue');

        // The "Issues" tab: the unpublished issue, its "Issue" row without a
        // DOI (Rules 14, 15, 16, 17); the Control of Rule 8.
        await dois.goto();
        await expect(dois.tabs()).toHaveText(['Articles', 'Issues']);
        await dois.openTab('Issues');
        await expect(dois.tabHeading()).toHaveText('Issues');
        await expect(dois.listTitle()).toHaveText('Issue DOIs');
        await expect(dois.rowLink(issueRow)).toHaveText(new RegExp(`^\\s*${ISSUE_2.replace(/[.()]/g, '\\$&')}\\s*$`));
        await expect(dois.rowBadge(issueRow)).toHaveText('Unpublished');
        await dois.expand(issueRow, issueId);
        expect(await dois.doiTypes(issueRow)).toEqual(['Issue']);
        await expect(dois.doiBox(issueRow, 'Issue')).toHaveValue('');

        // Scheduled into the issue: the "Article" row holds a DOI (Rule 5).
        await dois.openTab('Articles');
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveValue('');
        await scheduleIntoFutureIssue(page, tag, axolotl);
        await dois.goto();
        await dois.expand(axRow, axolotl.submissionId);
        const articleDoi = await doiValue(dois.doiBox(axRow, ARTICLE));
        await expect(dois.doiBadge(axRow, ARTICLE)).toHaveText('Unregistered');

        // "Publish Issue": the issue's DOI; the article keeps its own
        // (Rules 6a, 8).
        await page.goto(`/index.php/${tag}/manageIssues`);
        await publishIssue(page, ISSUE_2);
        await dois.goto();
        await dois.openTab('Issues');
        await dois.expand(issueRow, issueId);
        const issueDoi = await doiValue(dois.doiBox(issueRow, 'Issue'));
        await expect(dois.doiBadge(issueRow, 'Issue')).toHaveText('Unregistered');
        await dois.openTab('Articles');
        await dois.expand(axRow, axolotl.submissionId);
        await expect(dois.doiBox(axRow, ARTICLE)).toHaveValue(articleDoi);

        // The issue's page (Rule 43).
        const reader = await readerPage(browser, baseURL);
        await reader.goto(`/index.php/${tag}/issue/view/${issueId}`);
        await expect(reader.locator('.obj_issue_toc')).toBeVisible();
        await expect(issueDoiLink(reader)).toHaveText(resolving(issueDoi));
        await reader.context().close();
    });
});

/**
 * Schedule a seeded Production article into the journal's only (future)
 * issue without publishing it (U49's screens): "Assign To Future Issue and
 * Schedule Only" saved on "Publication Settings", then the publish button,
 * the panel's same choice when it opens, and "Schedule For Publication".
 */
async function scheduleIntoFutureIssue(page, tag, work) {
    await assignIssue(page, tag, work.submissionId, work.publicationId, 'Assign To Future Issue and Schedule Only', ISSUE_2_OPTION);
    await openPublication(page, tag, work.submissionId, work.publicationId);
    const publish = new PublishScreen(page, tag);
    const window = publishWindow(page);
    const panel = await publish.pressPublish({or: window});
    if (panel) {
        for (const [name, value] of [['versionStage', 'VoR'], ['versionIsMinor', 'false']]) {
            const box = panel.locator(`select[name="${name}"]`);
            if ((await box.count()) > 0 && (await box.isVisible()) && !(await box.inputValue())) {
                await box.selectOption(value);
            }
        }
        const scheduleOnly = panel.getByRole('radio', {name: 'Assign To Future Issue and Schedule Only', exact: true});
        if ((await scheduleOnly.count()) > 0) {
            await panel.getByRole('radio', {name: 'Assign To Future Issue and Publish Immediately', exact: true}).check();
            await scheduleOnly.check();
            await publish.selectIssueOption(panel, ISSUE_2_OPTION);
        }
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    }
    await expect(window).toContainText('Are you sure you want to schedule this for publication?', {timeout: 30_000});
    await publish.confirmPublish(window, 'Schedule For Publication');
    await expect(page.getByRole('button', {name: 'Unschedule', exact: true})).toBeVisible({timeout: 30_000});
}
