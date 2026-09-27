// @ts-check
/**
 * @file playwright/tests/U63-import-export.spec.js
 *
 * Import & export — OMP suite, one test per canonical scenario the spec
 * runs on a press: S1–S4 (common) and S5–S6 {OJS OMP}, in the press's own
 * words: the Press Manager, a monograph, the Native XML tabs "Import" and
 * "Export", the list "Monographs" with "Export Submissions", the results
 * tab "Results", the "Press Registration" email. S7–S10 are the journal's
 * (PubMed, DOAJ); the journal-only bullets inside the common scenarios
 * ("Export Issues", the unknown issue, "DOAJ Plugin" unticked, the
 * "Sections" filter group) have no press leg here; the press's own legs
 * ride in them: S3's ONIX reminder (OMP2) and "Internal Review" stage,
 * S4's unknown series (OMP3). Everything runs in the parallel `omp`
 * project: every scenario but S2 seeds its own scratch presses.
 * Spec: docs/specs/U63-import-export.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - OMP1 🐞: S1 never presses "Tab Delimited Content Import Plugin" (its
 *   page answers a server error); its line is read like the others.
 * - A8: S4's "Errors occured:" lines under a successful import are left
 *   unread.
 * - A10: S3 reads the stage filters' lists as the set they give; that the
 *   published monograph is in no stage is read only as its absence there.
 * - A2, A3: S6 leaves the imported roles' masthead choice and start dates
 *   unread.
 * - A1, A4–A7, A9, A11–A15: not on these scenarios' press paths.
 *   OJS1–OJS9: the journal's.
 *
 * Seeding (footnote sc): S2 reads `publicknowledge` with the roster; every
 * other scenario seeds its own scratch presses with `POST
 * scenarios/context` (a principal contact, a throwaway Press Manager named
 * in both presses of S1, S4 and S6; the editor's `permitSettings: false`
 * in S1) and `POST scenarios/submission` (`files[]`, `decisions[]`,
 * `published`). A new press has its ONIX details blank (S3). The files a
 * test imports are written by the test into its own output folder, from
 * an export it made on screen (S4, the series file by `nativeWithSeries`)
 * or by the builders of `shared/playwright/pages/ImportExportPages.js`
 * (S5). Scratch names
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
const {SectionsTab} = require('../../../../shared/playwright/pages/SectionsPages.js');
const {
    ToolsPage,
    NativeXmlPage,
    UsersXmlPage,
    recordToolNotices,
    downloadFrom,
    sideMenuEntry,
    expectSideMenu,
    deniedSentence,
    resultLines,
    usersXmlFile,
    usersInFile,
    expectEveryUserImported,
    md5,
    nativeWithUnknownElement,
    nativeWithSeries,
} = require('../../../../shared/playwright/pages/ImportExportPages.js');

const T = 30_000;
const PRESS = 'publicknowledge';

// ---- the OMP words ------------------------------------------------------------------
/** Native XML Plugin's labels on a press (Fields). */
const NATIVE = {exportTab: 'Export', exportButton: 'Export Submissions', importResults: 'Results'};
/** The Tools list's lines, in no fixed order (Rule 2; Fields; T-ojs-2). */
const TOOL_LINES = [
    "Native XML Plugin: Import and export books in OMP's native XML format.",
    'Tab Delimited Content Import Plugin: Import submissions into presses from tab delimited data.',
    'Users XML Plugin: Import and export users',
    'ONIX 3.0 Monograph Export Plugin: Export monograph metadata in the ONIX 3.0 format',
];
const TOOL_NAMES = TOOL_LINES.map((l) => l.slice(0, l.indexOf(':')));
const STAGES = ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'];
const EXPORTED = 'The export completed successfully. Download the exported file from the button below.';
const IMPORTED = 'The import completed successfully. The following items were imported:';
const FAILED = 'The process failed. Check below for errors/warnings.';
const USERS_IMPORTED =
    'The import completed successfully. Users with usernames and email addresses that are not already in use have been imported, along with accompanying user groups.';
/** The success sentence as the whole panel (the press's panel spaces its two sentences apart). */
const USERS_IMPORTED_WHOLE = new RegExp(`^\\s*${USERS_IMPORTED.replace(/[.]/g, '\\.').replace(/ /g, '\\s+')}\\s*$`);
const USERS_INTRO =
    'Select an XML data file containing user information to import into this press. See the press help for details on the format of this file.';
const USERS_NOTE =
    'Note that if the imported file contains any usernames or email addresses that already exist in the system, the user data for those users will not be imported and any new roles to be created will be assigned to the existing users.';
const NEW_PASSWORD_SENT = (u) =>
    `The imported user "${u}" password could not be imported as is. A new password is been send to the user email. The user has been imported.`;
const NO_MATCH = (u, e) => `The username "${u}" and the e-mail "${e}" do not match to the one and the same existing user.`;
const ONIX_REMINDER =
    'This press is missing some required information for ONIX metadata used in this export. Please go to Press Settings and fill in the missing details.';

const OKAPI = 'Okapi field notes';
const QUOKKA = 'Quokka survey';
const AXOLOTL = 'Axolotl limb memory';
const WOMBAT = 'Wombat notes';
const ZED = {path: 'zzz', title: 'Zed Series'};

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u63${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/** A scratch press's principal contact (footnote sc). */
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
 * Sign in through a press's login form in a fresh browser (the form
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
 * a password reset for the press's own manager, asked on the press's
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
 * The sidebar's global search on a press's Dashboard (every status);
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

test.describe('Import & export', () => {
    test("S1: the Tools page, its list and a tool's page", async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s1', testInfo);
        const manager = `${tag}mg`;
        const editor = `${tag}ed`;
        await ompApi.createContext({
            tag,
            context: contact(tag),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(editor, 'Edda', 'Editor', ['editor'])],
            roles: {editor: {permitSettings: false}},
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
        // (Purpose). "Tab Delimited Content Import Plugin" is not pressed (OMP1).
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
        await native.expectTabs(['Import', 'Export']);
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
        await new NativeXmlPage(edPage, tag, NATIVE).expectTabs(['Import', 'Export']);
    });

    test('S2: roles kept off the Tools page', async ({browser, baseURL, asUser}) => {
        test.setTimeout(180_000);
        const toolsUrl = `/index.php/${PRESS}/management/tools`;
        const nativeUrl = `/index.php/${PRESS}/management/importexport/plugin/NativeImportExportPlugin`;

        // The Series Editor: no "Tools" in the side menu (its other entries
        // on screen); both addresses answer the access-denied page (Actors
        // rows 1–2).
        const ana = await pageAs(asUser, 'sectioneditor.ana');
        await ana.goto(`/index.php/${PRESS}/user/profile`);
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

        // Control: the Press Manager opens both (Actors rows 1–2).
        const maya = await pageAs(asUser, 'manager.maya');
        const tools = new ToolsPage(maya, PRESS);
        await tools.goto();
        await expect(tools.tab('Import/Export')).toHaveAttribute('aria-selected', 'true');
        await expect(tools.line('Native XML Plugin')).toBeVisible();
        const native = new NativeXmlPage(maya, PRESS, NATIVE);
        await native.goto();
        await native.expectSelected('Import');
    });

    test('S3: exporting submissions', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const manager = `${tag}mg`;
        const ada = `${tag}al`;
        await ompApi.createContext({
            tag,
            context: contact(tag),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(ada, 'Ada', 'Lovelace', ['author'])],
        });
        const okapi = await ompApi.createSubmission({tag: `${tag}ok`, context: tag, submitter: ada, title: OKAPI});
        await ompApi.createSubmission({tag: `${tag}qu`, context: tag, submitter: ada, title: QUOKKA, decisions: ['sendExternalReview']});
        await ompApi.createSubmission({tag: `${tag}ax`, context: tag, submitter: ada, title: AXOLOTL, published: true});
        const page = await pageAs(asUser, manager);
        const native = new NativeXmlPage(page, tag, NATIVE);
        const list = native.list;

        // The export tab: the list titled "Monographs" with its search box
        // and "Filters"; three lines, each a box, the title and "View";
        // "Select All" and "Export Submissions" under it (Rule 14; Fields).
        await native.goto();
        await native.openExportTab();
        await expect(list.title()).toHaveText('Monographs');
        await expect(list.searchBox()).toBeVisible();
        await expect(list.filtersButton()).toBeVisible();
        await list.expectTitles([OKAPI, QUOKKA, AXOLOTL]);
        for (const title of [OKAPI, QUOKKA, AXOLOTL]) {
            await expect(list.box(title), title).not.toBeChecked();
            await expect(list.viewLink(title), title).toBeVisible();
        }
        await expect(list.selectButton()).toHaveText('Select All');
        await expect(list.exportButton()).toBeVisible();

        // The ONIX reminder: the sentence, "Press Settings" a link to
        // Settings › Press (Rule 19; Settings bullet 7; OMP2).
        await expect(list.panel).toContainText(ONIX_REMINDER);
        await expect(list.panel.getByRole('link', {name: 'Press Settings', exact: true})).toHaveAttribute(
            'href',
            new RegExp(`/index\\.php/${tag}/(en/)?management/settings/context$`)
        );

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

        // "Close": the tab goes; "Export" shows (Fields).
        await native.closeResultsTab('Export Submissions Results');
        await native.expectTabs(['Import', 'Export']);
        await native.expectSelected('Export');

        // "Filters": the panel's groups and buttons, no "Sections" group on a
        // press; "External Review", then "Submission" too (Rule 14a; Fields).
        // The published monograph matches no stage (A10, read as the lists'
        // sets).
        await list.openFilters();
        await expect(list.sidebarHeadings()).toHaveText(['Stages', 'Activity']);
        for (const stage of STAGES) {
            await expect(list.filterButton(stage), stage).toBeVisible();
        }
        await expect(list.addActivityFilterButton()).toBeVisible();
        await expect(list.sidebar().getByRole('slider', {name: 'Days since last activity', exact: true})).toBeVisible();
        await list.pressFilter('External Review');
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

    test('S4: importing submissions from another press', async ({browser, baseURL, asUser, ompApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const a = `${tag}a`;
        const b = `${tag}b`;
        const manager = `${tag}mg`;
        const ada = `${tag}al`;
        await ompApi.createContext({
            tag: a,
            context: contact(a),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(ada, 'Ada', 'Lovelace', ['author'])],
        });
        await ompApi.createContext({tag: b, context: contact(b), users: [{username: manager, roles: ['manager']}]});
        const okapi = await ompApi.createSubmission({tag: `${a}ok`, context: a, submitter: ada, title: OKAPI, files: [{file: 'article.pdf'}]});
        const page = await pageAs(asUser, manager);
        // Dashboard and settings reads go through a second page, so the
        // Native page's upload box keeps its file between the imports
        // (Rule 8).
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
        const seriesFile = testInfo.outputPath('okapi-series-zzz.xml');
        fs.writeFileSync(seriesFile, nativeWithSeries(file.text, {from: OKAPI, to: `${OKAPI} zzz`, ...ZED}));
        const wombatFile = testInfo.outputPath('wombat-unknown-element.xml');
        fs.writeFileSync(wombatFile, nativeWithUnknownElement(file.text, {element: 'monograph', from: OKAPI, to: WOMBAT}));

        // Choosing the file on B's "Import": its name in the box and "Change
        // File" (Rule 8).
        const nativeB = new NativeXmlPage(page, b, NATIVE);
        await nativeB.goto();
        await nativeB.expectSelected('Import');
        await nativeB.upload(okapiFile);
        await expect(nativeB.importForm()).toContainText('okapi-from-a.xml');
        await expect(nativeB.changeFileButton()).toBeVisible();

        // "Import": "Results" with the success text and the line
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

        // An unknown series: before, B's Settings › Press › "Series" has no
        // "Zed Series"; another "Results" tab with the success text, then
        // "Warnings encountered:" and "Unknown series zzz"; B's "Series" now
        // lists "Zed Series" (Rule 12a; OMP3).
        const seriesB = new SectionsTab(side, b, {tab: 'Series', addLabel: 'Add Series'});
        await seriesB.goto();
        await expect(seriesB.heading()).toBeVisible();
        await expect(seriesB.row(ZED.title)).toHaveCount(0);
        await nativeB.openTab('Import');
        await expect(nativeB.changeFileButton()).toBeVisible();
        await nativeB.upload(seriesFile);
        const seriesResults = await nativeB.pressImport();
        await expect(nativeB.tabsNamed(NATIVE.importResults)).toHaveCount(2);
        await expect(seriesResults).toContainText(IMPORTED);
        await expect(seriesResults).toHaveText(/Warnings encountered:[\s\S]*Unknown series zzz/);
        await expect(resultLines(seriesResults).filter({hasText: 'Unknown series zzz'})).toHaveCount(1);
        await seriesB.goto();
        await expect(seriesB.row(ZED.title)).toHaveCount(1);

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

    test('S5: importing users', async ({browser, baseURL, asUser, ompApi, pkpMail}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const manager = `${tag}mg`;
        const kiwi = `${tag}kiwi`;
        const nova = `${tag}nova`;
        const wren = `${tag}wren`;
        const tui = `${tag}tui`;
        const kiwiOther = `${tag}kiwi.other@mail.test`;
        await ompApi.createContext({
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
        // paragraphs in the press's words, the "File" box and "Import Users"
        // (Rule 21; Fields).
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
        await expect(firstResults).toHaveText(USERS_IMPORTED_WHOLE);

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

        // The email: "Press Registration" to wren, from the Press Manager,
        // replying to the principal contact, with the new password (Actors
        // row 4; Rule 25; Side effects bullet 2).
        const message = await pkpMail.find({to: mailOf(wren), subject: 'Press Registration'});
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

    test('S6: moving users from one press to another', async ({browser, baseURL, ompApi, pkpMail}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const a = `${tag}a`;
        const b = `${tag}b`;
        const manager = `${tag}mg`;
        const moss = `${tag}moss`;
        const fern = `${tag}fern`;
        await ompApi.createContext({
            tag: a,
            context: contact(a),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(moss, 'Moss', 'Copyeditor', ['copyeditor']), user(fern, 'Fern', 'Author', ['author'])],
        });
        await ompApi.createContext({tag: b, context: contact(b), users: [{username: manager, roles: ['manager']}]});
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
        await expect(users.columns()).toHaveText(['Select', 'Given Name', 'Family Name', 'Username', /^\s*Email( address)?\s*$/]); // "Email" or "Email address": the duplicate user.email key (U41 A19)
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

        // B's import: every account of the file imported (Rules 22, 28).
        const usersB = new UsersXmlPage(page, b);
        await usersB.goto();
        await usersB.upload(allFile);
        const results = await usersB.pressImport();
        // Every account of the file imported, in either of the two forms
        // the server's PHP decides (T-ojs-3): the success sentence, or the
        // "…could not be imported as is. … The user has been imported." line
        // for each account.
        await expectEveryUserImported(results, {
            usernames: inFile.map((u) => /** @type {string} */ (u.username)),
            successText: USERS_IMPORTED,
            newPasswordLine: NEW_PASSWORD_SENT,
        });

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
});
