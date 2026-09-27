// @ts-check
/**
 * @file playwright/tests/U63-import-export.spec.js
 *
 * Import & export — OJS suite, one test per canonical scenario the spec
 * runs on OJS in the parallel `ojs` project: S1–S4 (common), S5–S6 {OJS
 * OMP}, S7–S9 {OJS}. S10 puts a journal on "DOI Versioning" "Yes", which
 * makes every OJS OAI list request of the install answer 500 while it
 * lasts, so it runs in the `ojs-serial` project, after this one:
 * `tests/serial/U63-import-export.spec.js`.
 * Spec: docs/specs/U63-import-export.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A8: S4's "Errors occured:" lines under a successful import are left
 *   unread.
 * - A10: S3 reads the stage filters' lists as the set they give; that the
 *   published submission is in no stage is read only as its absence there.
 * - OJS4: S7 never presses a PubMed export (outbound HTTP is dead on the
 *   test installs: every one answers a "Validation errors:" page).
 * - OJS8: S9 unticks "Validate XML…" before "Register", as the scenario
 *   says; nothing reads whether the box holds it back.
 * - OJS9: S9 does not await DOAJ's answer; the queued deposit is never
 *   drained here.
 * - A1–A7, A9, A11–A15, OJS1–OJS3, OJS5–OJS7: not on these scenarios'
 *   paths. OMP1–OMP3: the press's.
 *
 * Seeding (footnote sc): S2 reads `publicknowledge` with the roster; every
 * other scenario seeds its own scratch journals with `POST
 * scenarios/context` (a principal contact, a throwaway Journal Manager
 * named in both journals of S1, S4 and S6) and `POST scenarios/submission`
 * (`files[]`, `decisions[]`, `published`, `issue`). The files a test
 * imports are written by the test into its own output folder, from an
 * export it made on screen (S4) or by the builders of
 * `shared/playwright/pages/ImportExportPages.js` (S5). Scratch names
 * ("kiwi", "moss") carry the test's tag.
 *
 * Every absence is read settled (the list's own fetch, the landing after
 * an action) and paired with a positive control taken the same way (M4,
 * M6); the mail catcher's silence is bounded by a message the test sends
 * or expects (A8). No results tab is ever pressed again (spec Rule 9: it
 * would import the file once more). Waits are web-first or bounded by the
 * screen's own answer (A5).
 */
const fs = require('fs');
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {EditorialDashboardPage} = require('../../../../shared/playwright/pages/EditorialDashboardPage.js');
const {UsersListPage} = require('../../../../shared/playwright/pages/UsersManagementPages.js');
const {IssuesAdmin} = require('../../../../shared/playwright/pages/IssuesPages.js');
const {
    ToolsPage,
    NativeXmlPage,
    UsersXmlPage,
    PubMedPage,
    DoajPage,
    recordToolNotices,
    expectToolNotice,
    downloadFrom,
    sideMenuEntry,
    expectSideMenu,
    deniedSentence,
    resultLines,
    usersXmlFile,
    usersInFile,
    md5,
    nativeWithIssue,
    nativeWithUnknownElement,
} = require('../../../../shared/playwright/pages/ImportExportPages.js');
const {PublishScreen} = require('../pages/PublishSchedulePages.js');

const T = 30_000;
const JOURNAL = 'publicknowledge';

// ---- the OJS words ------------------------------------------------------------------
/** Native XML Plugin's labels on a journal (Fields). */
const NATIVE = {exportTab: 'Export Articles', exportButton: 'Export Articles', importResults: 'Import Results'};
/** The Tools list's lines, in no fixed order (Rule 2; Fields; T-ojs-2). */
const TOOL_LINES = [
    'DOAJ Export Plugin: Export Journal for DOAJ.',
    'DataCite Export/Registration Plugin: Export or register issue, article, galley and supplementary file metadata in DataCite format.',
    'Crossref XML Export Plugin: Export article metadata in Crossref XML format.',
    "Native XML Plugin: Import and export articles and issues in OJS's native XML format.",
    'Users XML Plugin: Import and export users',
    'PubMed XML Export Plugin: Export article metadata in PubMed XML format for indexing in MEDLINE.',
];
const TOOL_NAMES = TOOL_LINES.map((l) => l.slice(0, l.indexOf(':')));
const EXPORTED = 'The export completed successfully. Download the exported file from the button below.';
const IMPORTED = 'The import completed successfully. The following items were imported:';
const FAILED = 'The process failed. Check below for errors/warnings.';
const USERS_IMPORTED =
    'The import completed successfully. Users with usernames and email addresses that are not already in use have been imported, along with accompanying user groups.';
const USERS_INTRO =
    'Select an XML data file containing user information to import into this journal. See the journal help for details on the format of this file.';
const USERS_NOTE =
    'Note that if the imported file contains any usernames or email addresses that already exist in the system, the user data for those users will not be imported and any new roles to be created will be assigned to the existing users.';
const NEW_PASSWORD_SENT = (u) =>
    `The imported user "${u}" password could not be imported as is. A new password is been send to the user email. The user has been imported.`;
const NO_MATCH = (u, e) => `The username "${u}" and the e-mail "${e}" do not match to the one and the same existing user.`;
const SAVED = 'Your changes have been saved.';
const NONE_SELECTED = 'No objects selected.';
const SUBMITTED = 'Articles submitted successfully';
const ONIX_REMINDER = /missing some required information for ONIX metadata/;
const NLM_HELP = 'The NLM Title Abbreviation for the journal. If you do not know the abbreviation,';
const DOAJ_KEY_HELP =
    "If you would like to register articles from within OJS, please enter your DOAJ API Key. Else, you'll still be able to export into the DOAJ XML format but you cannot register your articles with DOAJ from within OJS.";
const DOAJ_KEY_NOTE = 'You will find your API key on your DOAJ user page.';
const DOAJ_AUTO =
    'OJS will deposit articles automatically to DOAJ. Please note that this may take a short amount of time after publication to process (e.g. depending on your cronjob configuration). You can check for all unregistered articles.';
const VALIDATE = 'Validate XML before the export and registration.';

const OKAPI = 'Okapi field notes';
const QUOKKA = 'Quokka survey';
const AXOLOTL = 'Axolotl limb memory';
const WOMBAT = 'Wombat notes';
const OKAPI_CENSUS = 'Okapi forest census';
const ISSUE_1 = 'Vol. 1 No. 1 (2025)';
const ISSUE_2 = 'Vol. 1 No. 2 (2026)';
const PUBLISHED_ISSUE = {volume: 1, number: 1, year: 2025};

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u63${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/** A scratch journal's principal contact (footnote sc). */
const contact = (tag) => ({contactName: 'Pat Contact', contactEmail: mailOf(`${tag}pc`), country: 'CA'});

/** A page as `username`, recording the notices at the top right. */
async function pageAs(asUser, username) {
    const page = await (await asUser(username)).newPage();
    await recordToolNotices(page);
    return page;
}

/** A browser with nobody signed in (an explicit empty state, patterns.md lesson 8). */
async function freshPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    const page = await context.newPage();
    await recordToolNotices(page);
    return page;
}

/**
 * Sign in through a journal's login form in a fresh browser (the form
 * replaces a seeded account's stored password, footnote sc); returns the
 * signed-in page.
 */
async function signInByForm(browser, baseURL, contextPath, username, password = `${username}${username}`) {
    const page = await freshPage(browser, baseURL);
    const login = new LoginPage(page);
    await login.gotoContext(contextPath);
    await login.signIn(username, password);
    return page;
}

/**
 * The mail catcher's silence for `others`, bounded by a positive control:
 * a password reset for the journal's own manager, asked on the journal's
 * "Forgot your password?" page after the actions (A8). The manager's inbox
 * then holds that one message and nothing else.
 */
async function expectNoMailBesidesControl(browser, baseURL, pkpMail, tag, manager, others) {
    const visitor = await freshPage(browser, baseURL);
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

/**
 * The sidebar's global search on a journal's Dashboard (every status);
 * resolves once the list answered the phrase.
 */
async function dashboardSearch(dashboard, phrase) {
    const answered = dashboard.page.waitForResponse(
        (r) => /\/api\/v1\/_submissions/.test(r.url()) && r.url().includes(`searchPhrase=${encodeURIComponent(phrase)}`),
        {timeout: T}
    );
    await dashboard.globalSearch(phrase);
    await answered;
}

/** "Create New Version" on the version open ('true' "Minor Revision", 'false' "Major"); returns its publication id. */
async function createVersion(page, tag, isMinor) {
    const publish = new PublishScreen(page, tag);
    const dialog = await publish.openCreateVersionDialog();
    await dialog.locator('select[name="versionStage"]').selectOption('VoR');
    await dialog.locator('select[name="versionIsMinor"]').selectOption(isMinor);
    return publish.confirmVersionDialog(dialog);
}

/** The publish confirmation window (publish or schedule). */
function publishWindow(page) {
    return page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|schedule) this/}).last();
}

/**
 * Publish the version open on the workflow: through the "Review
 * Publishing Details" panel when it opens (its empty boxes filled),
 * straight to the confirmation window otherwise.
 */
async function publishOpenVersion(page, tag) {
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
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    }
    await expect(window).toBeVisible({timeout: T});
    await publish.confirmPublish(window, 'Publish');
    await expect(page.getByRole('button', {name: 'Unpublish', exact: true})).toBeVisible({timeout: T});
}

test.describe('Import & export', () => {
    test("S1: the Tools page, its list and a tool's page", async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s1', testInfo);
        const other = `${tag}x`;
        const manager = `${tag}mg`;
        const editor = `${tag}ed`;
        await ojsApi.createContext({
            tag,
            context: contact(tag),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(editor, 'Edda', 'Editor', ['editor'])],
            roles: {editor: {permitSettings: false}},
        });
        await ojsApi.createContext({
            tag: other,
            context: contact(other),
            users: [{username: manager, roles: ['manager']}],
            plugins: {doajplugin: {enabled: false}},
        });
        const page = await pageAs(asUser, manager);
        const tools = new ToolsPage(page, tag);

        // The Tools page from the side menu: "Import/Export" (open) and
        // "Permissions" (Rule 1).
        await page.goto(`/index.php/${tag}/dashboard/editorial`);
        await expectSideMenu(page);
        await sideMenuEntry(page, 'Tools').click();
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tag}/management/tools`));
        await tools.expectLoaded();
        await expect(tools.tabs()).toHaveText(['Import/Export', 'Permissions']);
        await expect(tools.tab('Import/Export')).toHaveAttribute('aria-selected', 'true');

        // The list: one line per tool, its name a link, then a colon and its
        // description (Rule 2; Fields). Control: "Users XML Plugin" is there
        // (Purpose).
        await tools.expectLineSet(TOOL_LINES);
        for (const name of TOOL_NAMES) {
            await expect(tools.toolLink(name), name).toBeVisible();
        }

        // A tool's page: heading, trail, tabs, the "Import" box; the trail's
        // "Tools" returns (Rules 4, 7; Fields).
        await tools.openTool('Native XML Plugin');
        const native = new NativeXmlPage(page, tag, NATIVE);
        await expect(native.trail()).toHaveText(/^\s*Tools\s*\/\s*Native XML Plugin\s*$/);
        await expect(native.trailToolsLink()).toBeVisible();
        await native.expectTabs(['Import', 'Export Articles', 'Export Issues']);
        await native.expectSelected('Import');
        await expect(native.uploadHeading()).toBeVisible();
        await expect(native.uploadButton()).toBeVisible();
        await expect(native.dropHint()).toBeVisible();
        await expect(native.importButton()).toBeVisible();
        await native.trailToolsLink().click();
        await tools.expectLoaded();
        await tools.expectLineSet(TOOL_LINES);

        // The Editor without "Permit changes to Settings": "Tools" in the
        // side menu, the same list, the Native XML page (Actors rows 1–2;
        // Settings bullet 1).
        const edPage = await pageAs(asUser, editor);
        await edPage.goto(`/index.php/${tag}/dashboard/editorial`);
        await expectSideMenu(edPage);
        await sideMenuEntry(edPage, 'Tools').click();
        const edTools = new ToolsPage(edPage, tag);
        await edTools.expectLoaded();
        await edTools.expectLineSet(TOOL_LINES);
        await edTools.openTool('Native XML Plugin');
        await new NativeXmlPage(edPage, tag, NATIVE).expectTabs(['Import', 'Export Articles', 'Export Issues']);

        // "DOAJ Plugin" unticked: no "DOAJ Export Plugin" line; "Native XML
        // Plugin" still there (Rule 33; Settings bullet 2).
        const offTools = new ToolsPage(page, other);
        await offTools.goto();
        await expect(offTools.line('Native XML Plugin')).toBeVisible();
        await expect(offTools.line('Users XML Plugin')).toBeVisible();
        await expect(offTools.line('DOAJ Export Plugin')).toHaveCount(0);
        await expect(offTools.lines()).toHaveCount(TOOL_LINES.length - 1);
    });

    test('S2: roles kept off the Tools page', async ({browser, baseURL, asUser}) => {
        test.setTimeout(180_000);
        const toolsUrl = `/index.php/${JOURNAL}/management/tools`;
        const nativeUrl = `/index.php/${JOURNAL}/management/importexport/plugin/NativeImportExportPlugin`;

        // The Section Editor: no "Tools" in the side menu (its other entries
        // on screen); both addresses answer the access-denied page (Actors
        // rows 1–2).
        const ana = await pageAs(asUser, 'sectioneditor.ana');
        await ana.goto(`/index.php/${JOURNAL}/user/profile`);
        await expectSideMenu(ana);
        await expect(sideMenuEntry(ana, 'Start A New Submission')).toHaveCount(1);
        await expect(sideMenuEntry(ana, 'Tools')).toHaveCount(0);
        for (const url of [toolsUrl, nativeUrl]) {
            await ana.goto(url);
            await expect(deniedSentence(ana), url).toBeVisible();
        }

        // Copyeditor, Reviewer, Author, Reader: the same page at both
        // addresses (Actors rows 1–2).
        for (const username of ['copyeditor.carla', 'reviewer.julia', 'author.alex', 'reader.rosa']) {
            const page = await pageAs(asUser, username);
            for (const url of [toolsUrl, nativeUrl]) {
                await page.goto(url);
                await expect(deniedSentence(page), `${username} at ${url}`).toBeVisible();
                await expect(page.locator('.pkp_page_importexport_plugins'), `${username} at ${url}`).toHaveCount(0);
            }
        }

        // Signed out: the Login page (Actors row 1).
        const visitor = await freshPage(browser, baseURL);
        await visitor.goto(toolsUrl);
        await expect(visitor).toHaveURL(/\/login/);
        await new LoginPage(visitor).expectForm();
        await visitor.context().close();

        // Control: the Journal Manager opens both (Actors rows 1–2).
        const maya = await pageAs(asUser, 'manager.maya');
        const tools = new ToolsPage(maya, JOURNAL);
        await tools.goto();
        await expect(tools.tab('Import/Export')).toHaveAttribute('aria-selected', 'true');
        await expect(tools.line('Native XML Plugin')).toBeVisible();
        const native = new NativeXmlPage(maya, JOURNAL, NATIVE);
        await native.goto();
        await native.expectSelected('Import');
    });

    test('S3: exporting submissions', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const manager = `${tag}mg`;
        const ada = `${tag}al`;
        await ojsApi.createContext({
            tag,
            context: contact(tag),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(ada, 'Ada', 'Lovelace', ['author'])],
            issues: [
                {...PUBLISHED_ISSUE, published: true},
                {volume: 1, number: 2, year: 2026},
            ],
        });
        const okapi = await ojsApi.createSubmission({tag: `${tag}ok`, context: tag, submitter: ada, title: OKAPI});
        await ojsApi.createSubmission({tag: `${tag}qu`, context: tag, submitter: ada, title: QUOKKA, decisions: ['sendExternalReview']});
        await ojsApi.createSubmission({tag: `${tag}ax`, context: tag, submitter: ada, title: AXOLOTL, published: true, issue: PUBLISHED_ISSUE});
        const page = await pageAs(asUser, manager);
        const native = new NativeXmlPage(page, tag, NATIVE);
        const list = native.list;

        // The export tab: the list titled "Articles" with its search box and
        // "Filters"; three lines, each a box, the title and "View"; "Select
        // All" and "Export Articles" under it (Rule 14; Fields). No ONIX
        // reminder on a journal (Rule 19).
        await native.goto();
        await native.openExportTab();
        await expect(list.title()).toHaveText('Articles');
        await expect(list.searchBox()).toBeVisible();
        await expect(list.filtersButton()).toBeVisible();
        await list.expectTitles([OKAPI, QUOKKA, AXOLOTL]);
        for (const title of [OKAPI, QUOKKA, AXOLOTL]) {
            await expect(list.box(title), title).not.toBeChecked();
            await expect(list.viewLink(title), title).toBeVisible();
        }
        await expect(list.selectButton()).toHaveText('Select All');
        await expect(list.exportButton()).toBeVisible();
        await expect(list.panel.getByText(ONIX_REMINDER)).toHaveCount(0);

        // "Select All": every line ticked, "Select None"; pressed, every line
        // unticked (Rule 15).
        await list.selectButton().click();
        for (const title of [OKAPI, QUOKKA, AXOLOTL]) await expect(list.box(title), title).toBeChecked();
        await expect(list.selectButton()).toHaveText('Select None');
        await list.selectButton().click();
        for (const title of [OKAPI, QUOKKA, AXOLOTL]) await expect(list.box(title), title).not.toBeChecked();
        await expect(list.selectButton()).toHaveText('Select All');

        // Exporting two: "Export Submissions Results" with the sentence and
        // "Download Exported File"; the file holds the two (Rule 16).
        await list.box(OKAPI).check();
        await list.box(AXOLOTL).check();
        const results = await list.pressExport(native);
        await expect(results).toContainText(EXPORTED);
        await expect(native.downloadButton(results)).toBeVisible();
        const file = await native.download(results);
        expect(file.name).toMatch(/\.xml$/);
        expect(file.text).toContain(OKAPI);
        expect(file.text).toContain(AXOLOTL);

        // "Close": the tab goes; "Export Issues" shows (Fields).
        await native.closeResultsTab('Export Submissions Results');
        await native.expectTabs(['Import', 'Export Articles', 'Export Issues']);
        await native.expectSelected('Export Issues');

        // "Export Issues": both issues, 1 item and 0; the published one
        // exported with its article (Rule 18; Fields).
        const issues = native.issues;
        await issues.expectLoaded();
        await expect(issues.columns()).toHaveText(['Select', 'Issue', 'Items']);
        await expect(issues.rows()).toHaveCount(2);
        await expect(issues.itemsCell(ISSUE_1)).toHaveText(/^\s*1\s*$/);
        await expect(issues.itemsCell(ISSUE_2)).toHaveText(/^\s*0\s*$/);
        await issues.box(ISSUE_1).check();
        const issueResults = await issues.pressExport(native);
        await expect(issueResults).toContainText(EXPORTED);
        const issueFile = await native.download(issueResults);
        expect(issueFile.name).toMatch(/\.xml$/);
        expect(issueFile.text).toMatch(/<issues?[\s>]/);
        expect(issueFile.text).toContain('<volume>1</volume>');
        expect(issueFile.text).toContain(AXOLOTL);

        // "Filters": the panel's groups and buttons; "Review", then
        // "Submission" too (Rule 14a; Fields). The published article matches
        // no stage (A10, read as the lists' sets).
        await native.openExportTab();
        await list.openFilters();
        await expect(list.sidebarHeadings()).toHaveText(['Stages', 'Activity', 'Sections']);
        for (const stage of ['Submission', 'Review', 'Copyediting', 'Production']) {
            await expect(list.filterButton(stage), stage).toBeVisible();
        }
        await expect(list.addActivityFilterButton()).toBeVisible();
        await expect(list.sidebar().getByRole('slider', {name: 'Days since last activity', exact: true})).toBeVisible();
        await expect(list.filterButton('Articles')).toBeVisible();
        await list.pressFilter('Review');
        await list.expectTitles([QUOKKA]);
        await list.pressFilter('Submission');
        await list.expectTitles([OKAPI, QUOKKA]);

        // Search: typed, nothing changes until Enter; Enter: "Okapi field
        // notes" alone; its "View" opens its workflow (Rule 14).
        const searched = [];
        page.on('request', (r) => {
            if (/\/api\/v1\/submissions\?/.test(r.url()) && r.url().includes('searchPhrase=')) searched.push(r.url());
        });
        await list.typeSearch('Okapi');
        await expect(list.searchBox()).toHaveValue('Okapi');
        await list.expectTitles([OKAPI, QUOKKA]);
        expect(searched, 'no search sent before Enter').toEqual([]);
        await list.commitSearch();
        await list.expectTitles([OKAPI]);
        await list.viewLink(OKAPI).click();
        const workflow = new WorkflowPage(page, tag);
        await workflow.expectOpen(okapi.submissionId);
        await expect(workflow.titleLine()).toContainText(OKAPI);

        // Control: the downloaded file holds no "Quokka survey" (Rule 16).
        expect(file.text).not.toContain(QUOKKA);
    });

    test('S4: importing submissions from another journal', async ({browser, baseURL, asUser, ojsApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const a = `${tag}a`;
        const b = `${tag}b`;
        const manager = `${tag}mg`;
        const ada = `${tag}al`;
        await ojsApi.createContext({
            tag: a,
            context: contact(a),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(ada, 'Ada', 'Lovelace', ['author'])],
        });
        await ojsApi.createContext({tag: b, context: contact(b), users: [{username: manager, roles: ['manager']}]});
        const okapi = await ojsApi.createSubmission({tag: `${a}ok`, context: a, submitter: ada, title: OKAPI, files: [{file: 'article.pdf'}]});
        const page = await pageAs(asUser, manager);
        // Dashboard reads go through a second page, so the Native page's
        // upload box keeps its file between the imports (Rule 8).
        const side = await page.context().newPage();

        // A's file: "Okapi field notes" exported and downloaded (Rule 16).
        const nativeA = new NativeXmlPage(page, a, NATIVE);
        await nativeA.goto();
        await nativeA.openExportTab();
        await nativeA.list.box(OKAPI).check();
        const exported = await nativeA.list.pressExport(nativeA);
        const file = await nativeA.download(exported);
        expect(file.name).toMatch(/\.xml$/);
        const okapiFile = testInfo.outputPath('okapi-from-a.xml');
        fs.writeFileSync(okapiFile, file.text);
        // The two further files, written from A's (footnote sc).
        const issueFile = testInfo.outputPath('okapi-issue-99.xml');
        fs.writeFileSync(issueFile, nativeWithIssue(file.text, {volume: 99, number: 9, year: 2099}));
        const wombatFile = testInfo.outputPath('wombat-unknown-element.xml');
        fs.writeFileSync(wombatFile, nativeWithUnknownElement(file.text, {element: 'article', from: OKAPI, to: WOMBAT}));

        // Choosing the file on B's "Import": its name in the box and "Change
        // File" (Rule 8).
        const nativeB = new NativeXmlPage(page, b, NATIVE);
        await nativeB.goto();
        await nativeB.expectSelected('Import');
        await nativeB.upload(okapiFile);
        await expect(nativeB.importForm()).toContainText('okapi-from-a.xml');
        await expect(nativeB.changeFileButton()).toBeVisible();

        // "Import": "Import Results" with the success text and the line
        // ""{number}" - "Okapi field notes"" (Rules 9, 10). A8's error lines
        // are left unread.
        const imported = await nativeB.pressImport();
        await expect(imported).toContainText(IMPORTED);
        const itemLine = resultLines(imported).filter({hasText: new RegExp(`^\\s*"\\d+" - "${OKAPI}"\\s*$`)});
        await expect(itemLine).toHaveCount(1);
        const number = Number(((await itemLine.innerText()).match(/"(\d+)"/) || [])[1]);
        expect(number).toBeGreaterThan(0);

        // B's Dashboard: "Okapi field notes" under that number in
        // "Submission"; its workflow shows the contributor and the file
        // (Rule 10).
        const dashB = new EditorialDashboardPage(side, b);
        await dashB.goto();
        await dashboardSearch(dashB, 'Okapi');
        const row = dashB.row(OKAPI);
        await expect(row).toHaveCount(1);
        await expect(row.getByRole('cell').first()).toHaveText(new RegExp(`^\\s*${number}\\s*$`));
        await expect(dashB.stageCell(row)).toContainText('Submission');
        const workflow = new WorkflowPage(side, b);
        await workflow.gotoEditorial(number);
        await expect(workflow.contributorsLine()).toContainText('Lovelace');
        await expect(workflow.dialog().getByText('article.pdf', {exact: true})).toBeVisible({timeout: T});

        // An unknown issue: another "Import Results" with the success text
        // and the issue line; B gains an unpublished issue 99/9/2099 (Rule 12).
        await nativeB.openTab('Import');
        await expect(nativeB.changeFileButton()).toBeVisible();
        await nativeB.upload(issueFile);
        const issueResults = await nativeB.pressImport();
        await expect(nativeB.tabsNamed(NATIVE.importResults)).toHaveCount(2);
        await expect(issueResults).toContainText(IMPORTED);
        await expect(
            resultLines(issueResults).filter({
                hasText: /^\s*None or more than one issue matches the given issue identification ".*<volume>99<\/volume><number>9<\/number><year>2099<\/year>.*"\.\s*$/,
            })
        ).toHaveCount(1);
        const issuesB = new IssuesAdmin(side, b);
        await issuesB.goto('Future Issues');
        await expect(issuesB.issueRow('Future Issues', 'Vol. 99 No. 9 (2099)')).toHaveCount(1);

        // A file that does not match the format: "The process failed…", then
        // "Errors occured:" and "Validation errors:", each with lines; no
        // "Wombat notes" on B's Dashboard (Rule 11).
        await nativeB.openTab('Import');
        await nativeB.upload(wombatFile);
        const failed = await nativeB.pressImport();
        await expect(nativeB.tabsNamed(NATIVE.importResults)).toHaveCount(3);
        await expect(failed).toContainText(FAILED);
        await expect(failed).toHaveText(/The process failed\. Check below for errors\/warnings\.\s*Errors occured:\s*\S[\s\S]*Validation errors:\s*\S/);
        await expect(failed.locator('h2').filter({hasText: /^\s*Validation errors:\s*$/}).locator('+ ul > li').first()).toBeVisible();
        await dashB.goto();
        await dashboardSearch(dashB, 'Okapi');
        await expect(dashB.row(OKAPI).first()).toBeVisible();
        await dashboardSearch(dashB, 'Wombat');
        await expect(dashB.row(WOMBAT)).toHaveCount(0);

        // Control: A's Dashboard still lists "Okapi field notes" in
        // "Submission" (Side effects bullet 3); no email from the import
        // (Rule 10; Side effects bullet 1).
        const dashA = new EditorialDashboardPage(side, a);
        await dashA.goto();
        await dashboardSearch(dashA, 'Okapi');
        const rowA = dashA.row(OKAPI);
        await expect(rowA).toHaveCount(1);
        await expect(rowA.getByRole('cell').first()).toHaveText(new RegExp(`^\\s*${okapi.submissionId}\\s*$`));
        await expect(dashA.stageCell(rowA)).toContainText('Submission');
        await expectNoMailBesidesControl(browser, baseURL, pkpMail, a, manager, [ada]);
    });

    test('S5: importing users', async ({browser, baseURL, asUser, ojsApi, pkpMail}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const manager = `${tag}mg`;
        const kiwi = `${tag}kiwi`;
        const nova = `${tag}nova`;
        const wren = `${tag}wren`;
        const tui = `${tag}tui`;
        const kiwiOther = `${tag}kiwi.other@mail.test`;
        await ojsApi.createContext({
            tag,
            context: contact(tag),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(kiwi, 'Kiwi', 'Author', ['author'])],
        });
        const first = testInfo.outputPath('users-first.xml');
        fs.writeFileSync(
            first,
            usersXmlFile([
                {givenName: 'Nova', familyName: 'New', email: mailOf(nova), username: nova, password: {plain: 'novapass1'}, roles: ['Copyeditor', 'Reader', 'Quokka Wrangler']},
            ])
        );
        const second = testInfo.outputPath('users-second.xml');
        fs.writeFileSync(
            second,
            usersXmlFile([
                {givenName: 'Wren', familyName: 'Hashed', email: mailOf(wren), username: wren, password: {encryption: 'md5', hash: md5('wrenpass12')}, roles: ['Reader']},
                {givenName: 'Kiwi', familyName: 'Other', email: kiwiOther, username: kiwi, password: {plain: 'kiwipass12'}, roles: ['Reader']},
                {givenName: 'Tui', familyName: 'Plain', email: mailOf(tui), username: tui, password: {plain: 'tuipass12'}, roles: ['Reader']},
            ])
        );
        const page = await pageAs(asUser, manager);
        const side = await page.context().newPage();
        const users = new UsersXmlPage(page, tag);

        // The page: "Import Users" (open) and "Export Users"; the two
        // paragraphs, the "File" box and "Import Users" (Rule 21; Fields).
        await users.goto();
        await users.expectTabs(['Import Users', 'Export Users']);
        await users.expectSelected('Import Users');
        await expect(users.visiblePanel()).toContainText(USERS_INTRO);
        await expect(users.visiblePanel()).toContainText(USERS_NOTE);
        await expect(users.fileHeading()).toBeVisible();
        await expect(users.uploadButton()).toBeVisible();
        await expect(users.importButton()).toBeVisible();

        // The first file: its name and "Change File"; "Import Users": a
        // "Results" tab with the success sentence (Rule 22).
        await users.upload(first);
        await expect(users.importForm()).toContainText('users-first.xml');
        await expect(users.changeFileButton()).toBeVisible();
        const firstResults = await users.pressImport();
        await expect(firstResults).toHaveText(new RegExp(`^\\s*${USERS_IMPORTED.replace(/[.]/g, '\\.')}\\s*$`));

        // nova: "Copyeditor" and "Reader" and no other (Rules 23, 24).
        const list = new UsersListPage(side, tag);
        await list.goto();
        await expect(list.row(mailOf(nova))).toHaveCount(1);
        expect((await list.cellLines(list.rolesCell(list.row(mailOf(nova))))).sort()).toEqual(['Copyeditor', 'Reader']);

        // nova signs in with "novapass1" (Rule 25).
        const novaPage = await signInByForm(browser, baseURL, tag, nova, 'novapass1');
        await expect(novaPage).not.toHaveURL(/\/login/);
        await novaPage.context().close();

        // The second file: a second "Results" tab, "Import/Export errors:"
        // with wren's and kiwi's lines and no success sentence (Rules 22,
        // 23, 25).
        await users.openTab('Import Users');
        await expect(users.changeFileButton()).toBeVisible();
        await users.upload(second);
        const secondResults = await users.pressImport();
        await expect(users.tabsNamed('Results')).toHaveCount(2);
        await expect(secondResults.getByRole('heading', {name: 'Import/Export errors:', exact: true})).toBeVisible();
        await expect(resultLines(secondResults)).toHaveText([NEW_PASSWORD_SENT(wren), NO_MATCH(kiwi, kiwiOther)]);
        await expect(secondResults).not.toContainText('The import completed successfully.');

        // The accounts: wren and tui with "Reader"; kiwi unchanged, "Author"
        // alone; no account with kiwi's other address (Rules 22, 23).
        await list.goto();
        for (const who of [wren, tui]) {
            await expect(list.row(mailOf(who)), who).toHaveCount(1);
            expect(await list.cellLines(list.rolesCell(list.row(mailOf(who)))), who).toEqual(['Reader']);
        }
        const kiwiRow = list.row(mailOf(kiwi));
        await expect(kiwiRow).toHaveCount(1);
        await expect(list.emailCell(kiwiRow)).toHaveText(new RegExp(`^\\s*${mailOf(kiwi).replace(/[.]/g, '\\.')}\\s*$`));
        expect(await list.cellLines(list.rolesCell(kiwiRow))).toEqual(['Author']);
        await expect(list.row(kiwiOther)).toHaveCount(0);

        // The email: "Journal Registration" to wren, from the Journal
        // Manager, replying to the principal contact, with the new password
        // (Actors row 4; Rule 25; Side effects bullet 2).
        const message = await pkpMail.find({to: mailOf(wren), subject: 'Journal Registration'});
        const full = await pkpMail.fullMessage(message.ID);
        expect(full.From.Address).toBe(mailOf(manager));
        expect((full.ReplyTo || []).map((r) => r.Address)).toEqual([mailOf(`${tag}pc`)]);
        const mailed = ((full.Text || '').match(/Password:\s*(\S+)/) || [])[1];
        expect(mailed, 'the email carries a password').toBeTruthy();

        // wren signs in with it: the account must change its password first
        // (Rule 25).
        const wrenPage = await freshPage(browser, baseURL);
        const login = new LoginPage(wrenPage);
        await login.gotoContext(tag);
        await login.submitCredentials(wren, /** @type {string} */ (mailed));
        await expect(wrenPage).toHaveURL(new RegExp(`/login/changePassword/${wren}`));
        await expect(wrenPage.getByRole('heading', {name: 'Change Password', exact: true})).toBeVisible();
        await wrenPage.context().close();

        // Control: no email to nova, tui, kiwi or the manager, wren's having
        // arrived (Actors row 4).
        for (const who of [nova, tui, kiwi, manager]) {
            expect(await pkpMail.count({to: mailOf(who)}), `no mail to ${who}`).toBe(0);
        }
    });

    test('S6: moving users from one journal to another', async ({browser, baseURL, ojsApi, pkpMail}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const a = `${tag}a`;
        const b = `${tag}b`;
        const manager = `${tag}mg`;
        const moss = `${tag}moss`;
        const fern = `${tag}fern`;
        await ojsApi.createContext({
            tag: a,
            context: contact(a),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(moss, 'Moss', 'Copyeditor', ['copyeditor']), user(fern, 'Fern', 'Author', ['author'])],
        });
        await ojsApi.createContext({tag: b, context: contact(b), users: [{username: manager, roles: ['manager']}]});
        // Every account signs in once through the login form (footnote sc).
        for (const who of [moss, fern]) {
            const once = await signInByForm(browser, baseURL, a, who);
            await once.context().close();
        }
        const page = await signInByForm(browser, baseURL, a, manager);
        const users = new UsersXmlPage(page, a);

        // "Export Users": "Current Users" with "Search" and "Export All
        // Users", the columns, moss and fern, "Export Users" (Rule 26; Fields).
        await users.goto();
        await users.openExportTab();
        await expect(users.gridTitle()).toHaveText('Current Users');
        await expect(users.headerLinks()).toHaveText([/^\s*Search\s*$/, /^\s*Export All Users\s*$/]);
        await expect(users.columns()).toHaveText(['Select', 'Given Name', 'Family Name', 'Username', 'Email']);
        await expect(users.row(mailOf(moss))).toHaveCount(1);
        await expect(users.row(mailOf(fern))).toHaveCount(1);
        await expect(users.exportUsersButton()).toBeVisible();

        // The filter: shown; by text, by role, all roles again; hidden again
        // (Rule 26; Fields).
        await users.toggleFilter();
        await expect(users.filterForm()).toBeVisible();
        await expect(users.filterText()).toBeVisible();
        await expect(users.filterRole().locator('option:checked')).toHaveText('All Roles');
        await expect(users.filterSearchButton()).toBeVisible();
        await users.search({text: moss});
        await expect(users.row(mailOf(moss))).toHaveCount(1);
        await expect(users.rows()).toHaveCount(1);
        await users.search({text: '', role: 'Author'});
        await expect(users.row(mailOf(fern))).toHaveCount(1);
        await expect(users.row(mailOf(moss))).toHaveCount(0);
        await users.search({text: '', role: 'All Roles'});
        await expect(users.row(mailOf(moss))).toHaveCount(1);
        await expect(users.row(mailOf(fern))).toHaveCount(1);
        // The filter's own "Search" closes the filter (T-ojs-1): the header's
        // "Search" shows it, and pressed again hides it.
        if (!(await users.filterForm().isVisible())) {
            await users.toggleFilter();
            await expect(users.filterForm()).toBeVisible();
        }
        await users.toggleFilter();
        await expect(users.filterForm()).toBeHidden();

        // Ticked rows: moss alone in the file (Rule 27).
        const downloads = [];
        page.on('download', (d) => downloads.push(d.suggestedFilename()));
        await users.rowBox(mailOf(moss)).check();
        const ticked = await downloadFrom(page, () => users.exportUsersButton().click());
        expect(ticked.name).toMatch(/\.xml$/);
        expect(usersInFile(ticked.text).map((u) => u.username)).toEqual([moss]);

        // "Export All Users": "Confirm"; "Cancel" downloads nothing; "OK"
        // downloads every account the list holds, with their roles in A
        // (Rule 27). The one download after "OK" bounds the silence after
        // "Cancel".
        await users.exportAllLink().click();
        await expect(users.confirmWindow()).toBeVisible();
        await expect(users.confirmWindow().getByRole('heading', {name: 'Confirm', exact: true})).toBeVisible();
        await expect(users.confirmWindow()).toContainText('Are you sure you wish to export all users?');
        await users.confirmWindow().getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(users.confirmWindow()).toBeHidden();
        await users.openExportAllConfirm();
        const all = await downloadFrom(page, () => users.confirmWindow().getByRole('button', {name: 'OK', exact: true}).click());
        expect(downloads, 'one download: "OK"\'s, none after "Cancel"').toHaveLength(2);
        const listUsernames = await users.rows().evaluateAll((trs) => trs.map((tr) => (tr.querySelectorAll('td')[3]?.textContent || '').trim()));
        const inFile = usersInFile(all.text);
        expect(inFile.map((u) => u.username).sort()).toEqual(listUsernames.sort());
        expect(inFile.find((u) => u.username === moss)?.roles).toEqual(['Copyeditor']);
        expect(inFile.find((u) => u.username === fern)?.roles).toEqual(['Author']);
        const allFile = testInfo.outputPath('users-all-from-a.xml');
        fs.writeFileSync(allFile, all.text);

        // B's import: the success sentence (Rules 22, 28).
        const usersB = new UsersXmlPage(page, b);
        await usersB.goto();
        await usersB.upload(allFile);
        const results = await usersB.pressImport();
        await expect(results).toHaveText(new RegExp(`^\\s*${USERS_IMPORTED.replace(/[.]/g, '\\.')}\\s*$`));

        // B's users: moss Copyeditor, fern Author (Rules 23, 28); A2 and A3
        // left unread.
        const listB = new UsersListPage(page, b);
        await listB.goto();
        expect(await listB.cellLines(listB.rolesCell(listB.row(mailOf(moss))))).toEqual(['Copyeditor']);
        expect(await listB.cellLines(listB.rolesCell(listB.row(mailOf(fern))))).toEqual(['Author']);

        // moss signs in to B with the password it had in A (Rule 23).
        const mossB = await signInByForm(browser, baseURL, b, moss);
        await expect(mossB).not.toHaveURL(/\/login/);
        await mossB.context().close();

        // Control: no email to moss or fern (Rule 28).
        await expectNoMailBesidesControl(browser, baseURL, pkpMail, b, manager, [moss, fern]);
    });

    test('S7: PubMed: the NLM title and the lists', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s7', testInfo);
        const manager = `${tag}mg`;
        const ada = `${tag}al`;
        await ojsApi.createContext({
            tag,
            context: contact(tag),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(ada, 'Ada', 'Lovelace', ['author'])],
            issues: [
                {...PUBLISHED_ISSUE, published: true},
                {volume: 1, number: 2, year: 2026},
            ],
        });
        await ojsApi.createSubmission({tag: `${tag}ax`, context: tag, submitter: ada, title: AXOLOTL, published: true, issue: PUBLISHED_ISSUE});
        await ojsApi.createSubmission({tag: `${tag}ok`, context: tag, submitter: ada, title: OKAPI});
        const page = await pageAs(asUser, manager);
        const pubmed = new PubMedPage(page, tag);

        // The page: "Settings" (open), "Export Articles", "Export Issues" (Rule 29).
        await pubmed.goto();
        await pubmed.expectTabs(['Settings', 'Export Articles', 'Export Issues']);
        await pubmed.expectSelected('Settings');

        // "NLM Title Abbreviation": empty, under its help and the NLM
        // Catalog link; saved with the notice (Rule 30; Fields).
        await pubmed.expectSettingsLoaded();
        await expect(pubmed.nlmBox()).toHaveValue('');
        await expect(pubmed.nlmHelp()).toBeVisible();
        await expect(pubmed.nlmCatalogLink()).toHaveAttribute('href', /nlmcatalog/);
        await pubmed.nlmBox().fill('J Pub Knowl');
        await pubmed.save();
        await expectToolNotice(page, SAVED);

        // "Export Articles": both articles; "Select All" / "Select None";
        // "Export Articles" not pressed (OJS4) (Rules 15, 31).
        await pubmed.openExportTab();
        const list = pubmed.list;
        await list.expectTitles([AXOLOTL, OKAPI]);
        await list.selectButton().click();
        for (const title of [AXOLOTL, OKAPI]) await expect(list.box(title), title).toBeChecked();
        await expect(list.selectButton()).toHaveText('Select None');
        await list.selectButton().click();
        for (const title of [AXOLOTL, OKAPI]) await expect(list.box(title), title).not.toBeChecked();
        await expect(list.exportButton()).toBeVisible();

        // "Export Issues": both issues, 1 item and 0, "Export Issues" not
        // pressed (Rules 18, 32).
        await pubmed.openIssuesTab();
        await expect(pubmed.issues.columns()).toHaveText(['Select', 'Issue', 'Items']);
        await expect(pubmed.issues.rows()).toHaveCount(2);
        await expect(pubmed.issues.itemsCell(ISSUE_1)).toHaveText(/^\s*1\s*$/);
        await expect(pubmed.issues.itemsCell(ISSUE_2)).toHaveText(/^\s*0\s*$/);
        await expect(pubmed.issues.exportButton()).toBeVisible();

        // Control: reloaded, the page opens on "Settings" with the saved
        // abbreviation (Rule 30).
        await page.reload();
        await pubmed.expectLoaded();
        await pubmed.expectSelected('Settings');
        await pubmed.expectSettingsLoaded();
        await expect(pubmed.nlmBox()).toHaveValue('J Pub Knowl');
    });

    test('S8: DOAJ: exporting and marking articles', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s8', testInfo);
        const manager = `${tag}mg`;
        const ada = `${tag}al`;
        await ojsApi.createContext({
            tag,
            context: contact(tag),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(ada, 'Ada', 'Lovelace', ['author'])],
            issues: [{...PUBLISHED_ISSUE, published: true}],
        });
        const okapi = await ojsApi.createSubmission({tag: `${tag}ok`, context: tag, submitter: ada, title: OKAPI_CENSUS, published: true, issue: PUBLISHED_ISSUE});
        const axolotl = await ojsApi.createSubmission({tag: `${tag}ax`, context: tag, submitter: ada, title: AXOLOTL, published: true, issue: PUBLISHED_ISSUE});
        await ojsApi.createSubmission({tag: `${tag}qu`, context: tag, submitter: ada, title: QUOKKA});
        const page = await pageAs(asUser, manager);
        const doaj = new DoajPage(page, tag);
        const okapiRow = `Lovelace; ${OKAPI_CENSUS}`;
        const axolotlRow = `Lovelace; ${AXOLOTL}`;

        // The page: heading, trail, "Settings" (open) and "Articles" (Rules 4, 34).
        await doaj.goto();
        await expect(doaj.trail()).toHaveText(/^\s*Tools\s*\/\s*DOAJ Export Plugin\s*$/);
        await doaj.expectTabs(['Settings', 'Articles']);
        await doaj.expectSelected('Settings');

        // The Settings tab (Rules 35, 43; Fields).
        await doaj.expectSettingsLoaded();
        await expect(doaj.contactLink()).toBeVisible();
        await expect(doaj.settingsPanel.getByText(DOAJ_KEY_HELP, {exact: true})).toBeVisible();
        await expect(doaj.apiKeyBox()).toHaveValue('');
        await expect(doaj.settingsPanel.getByText(DOAJ_KEY_NOTE, {exact: false})).toBeVisible();
        await expect(doaj.autoBox()).toHaveAccessibleName(DOAJ_AUTO);
        await expect(doaj.autoBox()).not.toBeChecked();

        // The Articles tab: title, "Search", columns, the two published
        // rows and no "Quokka survey", the count line, the validation box
        // ticked, "Export" and "Mark registered", no "Register" (Rules 36–38,
        // 40).
        await doaj.openListTab('Articles');
        await expect(doaj.gridTitle()).toHaveText('Articles');
        await expect(doaj.searchLink()).toBeVisible();
        await expect(doaj.columns()).toHaveText(['Select', 'ID', 'Author; Title', 'Issue', 'Status']);
        await expect(doaj.rows()).toHaveCount(2);
        expect(await doaj.rowCells(okapiRow)).toEqual(['', String(okapi.submissionId), okapiRow, ISSUE_1, 'Not Deposited']);
        expect(await doaj.rowCells(axolotlRow)).toEqual(['', String(axolotl.submissionId), axolotlRow, ISSUE_1, 'Not Deposited']);
        await expect(doaj.row(QUOKKA)).toHaveCount(0);
        await expect(doaj.pagingLine()).toContainText('1 - 2 of 2 items');
        await expect(doaj.validationLabel()).toBeVisible();
        await expect(doaj.validationBox()).toBeChecked();
        await expect(doaj.actionButtons()).toHaveText(['Export', 'Mark registered']);
        await expect(doaj.actionButton('deposit')).toHaveCount(0);

        // Nothing ticked: "Export", then "Mark registered": back on the tab
        // with "No objects selected." (Rule 39).
        for (const action of ['export', 'markRegistered']) {
            await doaj.pressAndLand(action);
            await doaj.expectSelected('Articles');
            await expectToolNotice(page, NONE_SELECTED);
        }

        // "Export", unvalidated: the file of "Okapi forest census"; the
        // statuses unchanged (Rule 40).
        await doaj.validationBox().uncheck();
        await doaj.rowBox(okapiRow).check();
        const file = await downloadFrom(page, () => doaj.actionButton('export').click());
        expect(file.name).toMatch(/\.xml$/);
        expect(file.text).toContain(OKAPI_CENSUS);
        expect(file.text).not.toContain(AXOLOTL);
        await doaj.goto();
        await doaj.openListTab('Articles');
        await expect(doaj.status(okapiRow)).toHaveText('Not Deposited');
        await expect(doaj.status(axolotlRow)).toHaveText('Not Deposited');

        // "Mark registered": back on the tab, "Axolotl limb memory" reads
        // "Marked registered" (Rule 41).
        await doaj.rowBox(axolotlRow).check();
        await doaj.pressAndLand('markRegistered');
        await doaj.expectSelected('Articles');
        await expect(doaj.status(axolotlRow)).toHaveText('Marked registered');
        await expect(doaj.status(okapiRow)).toHaveText('Not Deposited');

        // The filter: its lists and "Search"; "Marked registered" lists
        // "Axolotl limb memory" alone (Rule 36a; Fields).
        await doaj.openFilter();
        await expect(doaj.filterSelect('column').locator('option:checked')).toHaveText('Article Title');
        await expect(doaj.filterText()).toBeVisible();
        await expect(doaj.filterSelect('issueId').locator('option:checked')).toHaveText('Any Issue');
        await expect(doaj.filterSelect('statusId').locator('option:checked')).toHaveText('Any Status');
        await expect(doaj.filterSearchButton()).toBeVisible();
        await doaj.filterByStatus('Marked registered');
        await expect(doaj.row(axolotlRow)).toHaveCount(1);
        await expect(doaj.rows()).toHaveCount(1);

        // A new version: the title opens the workflow; a published new
        // version turns the row to "Needs Sync" (Rules 36, 44).
        await doaj.titleLink(axolotlRow).click();
        const workflow = new WorkflowPage(page, tag);
        await workflow.expectOpen(axolotl.submissionId);
        const version = await createVersion(page, tag, 'true');
        const publish = new PublishScreen(page, tag);
        await publish.gotoVersionPage(axolotl.submissionId, version, 'titleAbstract', 'Title & Abstract');
        await publishOpenVersion(page, tag);
        await doaj.goto();
        await doaj.openListTab('Articles');
        await expect(doaj.status(axolotlRow)).toHaveText('Needs Sync');

        // Control: "Okapi forest census", never marked, "Not Deposited" (Rule 37).
        await expect(doaj.status(okapiRow)).toHaveText('Not Deposited');
    });

    test('S9: DOAJ: registering articles', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s9', testInfo);
        const manager = `${tag}mg`;
        const ada = `${tag}al`;
        await ojsApi.createContext({
            tag,
            context: contact(tag),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(ada, 'Ada', 'Lovelace', ['author'])],
            issues: [{...PUBLISHED_ISSUE, published: true}],
        });
        await ojsApi.createSubmission({tag: `${tag}ok`, context: tag, submitter: ada, title: OKAPI_CENSUS, published: true, issue: PUBLISHED_ISSUE});
        await ojsApi.createSubmission({tag: `${tag}ax`, context: tag, submitter: ada, title: AXOLOTL, published: true, issue: PUBLISHED_ISSUE});
        const page = await pageAs(asUser, manager);
        const doaj = new DoajPage(page, tag);
        const okapiRow = `Lovelace; ${OKAPI_CENSUS}`;
        const axolotlRow = `Lovelace; ${AXOLOTL}`;

        // No key: "Export" and "Mark registered", no "Register" (Rule 38).
        await doaj.goto();
        await doaj.openListTab('Articles');
        await expect(doaj.actionButtons()).toHaveText(['Export', 'Mark registered']);
        await expect(doaj.actionButton('deposit')).toHaveCount(0);

        // Saving a key: dots; the notice; the box again after a reload
        // (Rule 35; Fields).
        await doaj.openTab('Settings');
        await doaj.expectSettingsLoaded();
        await doaj.apiKeyBox().fill('u63-dummy-key');
        await expect(doaj.apiKeyBox()).toHaveAttribute('type', 'password');
        await doaj.save();
        await expectToolNotice(page, SAVED);
        await doaj.goto();
        await doaj.expectSettingsLoaded();
        await expect(doaj.apiKeyBox()).toHaveAttribute('type', 'password');

        // "Register" offered first (Rule 38; Settings bullet 3).
        await doaj.openListTab('Articles');
        await expect(doaj.actionButtons()).toHaveText(['Register', 'Export', 'Mark registered']);

        // Nothing ticked: "No objects selected." (Rule 39).
        await doaj.pressAndLand('deposit');
        await doaj.expectSelected('Articles');
        await expectToolNotice(page, NONE_SELECTED);

        // "Register", unvalidated (OJS8): "Articles submitted successfully",
        // the row "Submitted" (Rule 42). DOAJ's answer is not awaited (OJS9).
        await doaj.validationBox().uncheck();
        await doaj.rowBox(okapiRow).check();
        await doaj.pressAndLand('deposit');
        await doaj.expectSelected('Articles');
        await expectToolNotice(page, SUBMITTED);
        await expect(doaj.status(okapiRow)).toHaveText('Submitted');

        // Control: "Axolotl limb memory", not ticked, "Not Deposited" (Rule 37).
        await expect(doaj.status(axolotlRow)).toHaveText('Not Deposited');
    });
});
