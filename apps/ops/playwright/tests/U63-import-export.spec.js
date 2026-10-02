// @ts-check
/**
 * @file playwright/tests/U63-import-export.spec.js
 *
 * Import & export — OPS suite, one test per canonical scenario the spec
 * runs on a preprint server: S1–S4 (common), in the preprint server's own
 * words (the Preprint Server Manager, the "Export Preprints" tab, list
 * and button, the "Production" stage the seeded preprints wait in). S5–S6
 * are {OJS OMP} and S7–S10 {OJS}: a preprint server has no "Users XML
 * Plugin", no PubMed and no DOAJ tool, which S1's control reads on the
 * server's own Tools list (its two lines alone). S1's Editor bullet and
 * "DOAJ Plugin" bullet are the journal's and the press's (a preprint
 * server has no Editor role and no DOAJ tool), S3's "Export Issues" and
 * ONIX bullets the journal's and the press's (the ONIX reminder is read
 * absent), S4's unknown-issue and unknown-series bullets likewise.
 * Everything runs in the parallel `ops` project: every scenario reads its
 * own scratch server or the seeded one, and nothing here scans globally.
 * Spec: docs/specs/U63-import-export.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A8: S4's "Errors occured:" lines under a successful import are left
 *   unread.
 * - A10: S3 reads the "Production" filter's list as the set it gives;
 *   that the posted preprint is in no stage is read only as its absence
 *   there.
 * - A1, A4–A7, A9, A11–A16, A19–A24: not on these scenarios' paths. OJS1–OJS9: the
 *   journal's. OMP1–OMP3: the press's.
 *
 * Seeding (footnote sc): S2 reads `publicknowledge` with the OPS roster
 * (`assistant.rita` is the Editorial Board Member; a preprint server has
 * no Reviewer); every other scenario seeds its own scratch servers with
 * `POST scenarios/context` (a principal contact, a throwaway Preprint
 * Server Manager named in both servers of S4) and `POST
 * scenarios/submission` (`galleys[]` with `preprint.pdf`, `published`). A
 * seeded preprint without `published` is submitted and waits in
 * Production. The files S4 imports are written by the test into its own
 * output folder from the export it made on screen. Scratch names carry
 * the test's tag.
 *
 * Every absence is read settled (the list's own fetch, the landing after
 * an action) and paired with a positive control taken the same way (M4,
 * M6); the mail catcher's silence is bounded by a message the test asks
 * for (A8). No results tab is ever pressed again (spec Rule 9: it would
 * import the file once more). Waits are web-first or bounded by the
 * screen's own answer (A5).
 */
const fs = require('fs');
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {EditorialDashboardPage} = require('../pages/EditorialDashboardPage.js');
const {GalleyFilesPage} = require('../pages/SubmissionFilesPages.js');
const {
    ToolsPage,
    NativeXmlPage,
    sideMenuEntry,
    expectSideMenu,
    deniedSentence,
    resultLines,
    nativeWithUnknownElement,
} = require('../../../../shared/playwright/pages/ImportExportPages.js');

const T = 30_000;
const SERVER = 'publicknowledge';

// ---- the OPS words ------------------------------------------------------------------
/** Native XML Plugin's labels on a preprint server (Fields). */
const NATIVE = {exportTab: 'Export Preprints', exportButton: 'Export Preprints', importResults: 'Import Results'};
/** The Tools list's lines, in no fixed order (Rule 2; Fields; T-ojs-2). */
const TOOL_LINES = [
    'Crossref XML Export Plugin: Export preprint metadata in Crossref XML format.',
    "Native XML Plugin: Import and export submissions in OPS's native XML format.",
];
const TOOL_NAMES = TOOL_LINES.map((l) => l.slice(0, l.indexOf(':')));
/** The journal's and the press's tools a preprint server does not list (Purpose; Fields). */
const NOT_LISTED = ['Users XML Plugin', 'DOAJ Export Plugin', 'PubMed XML Export Plugin', 'DataCite Export/Registration Plugin'];
const NATIVE_TABS = ['Import', 'Export Preprints'];
const EXPORTED = 'The export completed successfully. Download the exported file from the button below.';
const IMPORTED = 'The import completed successfully. The following items were imported:';
const FAILED = 'The process failed. Check below for errors/warnings.';
const ONIX_REMINDER = /missing some required information for ONIX metadata/;
const PREPRINT_LABELS = {publicationGroup: 'Preprint'};

const OKAPI = 'Okapi field notes';
const QUOKKA = 'Quokka survey';
const AXOLOTL = 'Axolotl limb memory';
const WOMBAT = 'Wombat notes';
const GALLEY = 'PDF';
const PREPRINT_FILE = 'preprint.pdf';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u63${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/** A scratch server's principal contact (footnote sc). */
const contact = (tag) => ({contactName: 'Pat Contact', contactEmail: mailOf(`${tag}pc`), country: 'CA'});

/** A page as `username`. */
async function pageAs(asUser, username) {
    return (await asUser(username)).newPage();
}

/** A browser with nobody signed in (an explicit empty state, patterns.md lesson 8). */
async function freshPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    return context.newPage();
}

/**
 * The mail catcher's silence for `others`, bounded by a positive control:
 * a password reset for the server's own manager, asked on the server's
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
 * The sidebar's global search on a server's Dashboard (every status);
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
    test("S1: the Tools page, its list and a tool's page", async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(120_000);
        const tag = makeTag('s1', testInfo);
        const manager = `${tag}mg`;
        await opsApi.createContext({tag, context: contact(tag), users: [user(manager, 'Mona', 'Manager', ['manager'])]});
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
        // description, the preprint server's two lines (Rule 2; Fields).
        await tools.expectLineSet(TOOL_LINES);
        for (const name of TOOL_NAMES) {
            await expect(tools.toolLink(name), name).toBeVisible();
        }

        // Control: no "Users XML Plugin" line (nor the journal's other
        // tools); the list holds its two lines alone, read beside them
        // (Purpose; Fields).
        await expect(tools.line('Native XML Plugin')).toBeVisible();
        for (const name of NOT_LISTED) {
            await expect(tools.line(name), name).toHaveCount(0);
            await expect(tools.toolLink(name), name).toHaveCount(0);
        }
        await expect(tools.lines()).toHaveCount(TOOL_LINES.length);

        // A tool's page: heading, trail, the tabs "Import" (open) and "Export
        // Preprints", the "Import" box; the trail's "Tools" returns (Rules 4,
        // 7; Fields).
        await tools.openTool('Native XML Plugin');
        const native = new NativeXmlPage(page, tag, NATIVE);
        await expect(native.trail()).toHaveText(/^\s*Tools\s*\/\s*Native XML Plugin\s*$/);
        await expect(native.trailToolsLink()).toBeVisible();
        await native.expectTabs(NATIVE_TABS);
        await native.expectSelected('Import');
        await expect(native.uploadHeading()).toBeVisible();
        await expect(native.uploadButton()).toBeVisible();
        await expect(native.dropHint()).toBeVisible();
        await expect(native.importButton()).toBeVisible();
        await native.trailToolsLink().click();
        await tools.expectLoaded();
        await tools.expectLineSet(TOOL_LINES);
    });

    test('S2: roles kept off the Tools page', async ({browser, baseURL, asUser}) => {
        test.setTimeout(120_000);
        const toolsUrl = `/index.php/${SERVER}/management/tools`;
        const nativeUrl = `/index.php/${SERVER}/management/importexport/plugin/NativeImportExportPlugin`;

        // The Section Editor (the server's Moderator): no "Tools" in the side
        // menu (its other entries on screen); both addresses answer the
        // access-denied page (Actors rows 1–2).
        const ana = await pageAs(asUser, 'sectioneditor.ana');
        await ana.goto(`/index.php/${SERVER}/user/profile`);
        await expectSideMenu(ana);
        await expect(sideMenuEntry(ana, 'Start A New Submission')).toHaveCount(1);
        await expect(sideMenuEntry(ana, 'Tools')).toHaveCount(0);
        for (const url of [toolsUrl, nativeUrl]) {
            await ana.goto(url);
            await expect(deniedSentence(ana), url).toBeVisible();
        }

        // Editorial Board Member, Author, Reader: the same page at both
        // addresses (Actors rows 1–2).
        for (const username of ['assistant.rita', 'author.alex', 'reader.rosa']) {
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

        // Control: the Preprint Server Manager opens both (Actors rows 1–2).
        const maya = await pageAs(asUser, 'manager.maya');
        const tools = new ToolsPage(maya, SERVER);
        await tools.goto();
        await expect(tools.tab('Import/Export')).toHaveAttribute('aria-selected', 'true');
        await expect(tools.line('Native XML Plugin')).toBeVisible();
        const native = new NativeXmlPage(maya, SERVER, NATIVE);
        await native.goto();
        await native.expectSelected('Import');
    });

    test('S3: exporting submissions', async ({asUser, opsApi, appContext}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s3', testInfo);
        const manager = `${tag}mg`;
        const ada = `${tag}al`;
        await opsApi.createContext({
            tag,
            context: contact(tag),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(ada, 'Ada', 'Lovelace', ['author'])],
        });
        const okapi = await opsApi.createSubmission({tag: `${tag}ok`, context: tag, submitter: ada, title: OKAPI});
        await opsApi.createSubmission({tag: `${tag}qu`, context: tag, submitter: ada, title: QUOKKA});
        await opsApi.createSubmission({
            tag: `${tag}ax`,
            context: tag,
            submitter: ada,
            title: AXOLOTL,
            galleys: [{label: GALLEY, file: PREPRINT_FILE}],
            published: true,
        });
        const page = await pageAs(asUser, manager);
        const native = new NativeXmlPage(page, tag, NATIVE);
        const list = native.list;

        // The export tab: the list titled "Preprints" with its search box and
        // "Filters"; three lines, each a box, the title and "View"; "Select
        // All" and "Export Preprints" under it (Rule 14; Fields). No ONIX
        // reminder on a preprint server, read beside the list's title
        // (Rule 19).
        await native.goto();
        await native.openExportTab();
        await expect(list.title()).toHaveText('Preprints');
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

        // "Close": the tab goes; "Export Preprints" shows (Fields).
        await native.closeResultsTab('Export Submissions Results');
        await native.expectTabs(NATIVE_TABS);
        await native.expectSelected('Export Preprints');

        // "Filters": the panel's groups; "Production" alone under "Stages"
        // (the journal's stages read absent beside it), "Days since last
        // activity" with "Add filter", the section's line; "Production"
        // pressed lists the two unposted preprints (Rule 14a; Fields). The
        // posted one matches no stage (A10, read as the list's set).
        await list.expectLoaded();
        await list.openFilters();
        await expect(list.sidebarHeadings()).toHaveText(['Stages', 'Activity', 'Sections']);
        await expect(list.filterButton('Production')).toBeVisible();
        for (const stage of ['Submission', 'Review', 'Internal Review', 'External Review', 'Copyediting']) {
            await expect(list.filterButton(stage), stage).toHaveCount(0);
        }
        await expect(list.addActivityFilterButton()).toBeVisible();
        await expect(list.sidebar().getByRole('slider', {name: 'Days since last activity', exact: true})).toBeVisible();
        await expect(list.filterButton('Preprints')).toBeVisible();
        await list.pressFilter('Production');
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
        const workflow = new WorkflowPage(page, tag, {appContext, labels: PREPRINT_LABELS});
        await workflow.expectOpen(okapi.submissionId);
        await expect(workflow.titleLine()).toContainText(OKAPI);

        // Control: the downloaded file holds no "Quokka survey", which was not
        // ticked (Rule 16).
        expect(file.text).not.toContain(QUOKKA);
    });

    test('S4: importing submissions from another journal', async ({browser, baseURL, asUser, opsApi, pkpMail, appContext}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const a = `${tag}a`;
        const b = `${tag}b`;
        const manager = `${tag}mg`;
        const ada = `${tag}al`;
        await opsApi.createContext({
            tag: a,
            context: contact(a),
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(ada, 'Ada', 'Lovelace', ['author'])],
        });
        await opsApi.createContext({tag: b, context: contact(b), users: [{username: manager, roles: ['manager']}]});
        const okapi = await opsApi.createSubmission({
            tag: `${a}ok`,
            context: a,
            submitter: ada,
            title: OKAPI,
            galleys: [{label: GALLEY, file: PREPRINT_FILE}],
        });
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
        // The file the format refuses, written from A's (footnote sc).
        const wombatFile = testInfo.outputPath('wombat-unknown-element.xml');
        fs.writeFileSync(wombatFile, nativeWithUnknownElement(file.text, {element: 'preprint', from: OKAPI, to: WOMBAT}));

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
        // "Production", the stage it had in A; its workflow shows the
        // contributor and, on the "Galleys" page, its file's galley (Rule 10).
        const dashB = new EditorialDashboardPage(side, b);
        await dashB.goto();
        await dashboardSearch(dashB, 'Okapi');
        const row = dashB.row(OKAPI);
        await expect(row).toHaveCount(1);
        await expect(row.getByRole('cell').first()).toHaveText(new RegExp(`^\\s*${number}\\s*$`));
        await expect(dashB.stageCell(row)).toContainText('Production');
        const workflow = new WorkflowPage(side, b, {appContext, labels: PREPRINT_LABELS});
        await workflow.gotoEditorial(number);
        await expect(workflow.contributorsLine()).toContainText('Lovelace');
        await workflow.selectPage('Galleys');
        await expect(new GalleyFilesPage(side, workflow).galleyRow(GALLEY)).toBeVisible({timeout: T});

        // A file that does not match the format: "The process failed…", then
        // "Errors occured:" and "Validation errors:", each with lines; no
        // "Wombat notes" on B's Dashboard, read beside "Okapi field notes"
        // (Rule 11).
        await nativeB.openTab('Import');
        await expect(nativeB.changeFileButton()).toBeVisible();
        await nativeB.upload(wombatFile);
        const failed = await nativeB.pressImport();
        await expect(nativeB.tabsNamed(NATIVE.importResults)).toHaveCount(2);
        await expect(failed).toContainText(FAILED);
        await expect(failed).toHaveText(/The process failed\. Check below for errors\/warnings\.\s*Errors occured:\s*\S[\s\S]*Validation errors:\s*\S/);
        await expect(failed.locator('h2').filter({hasText: /^\s*Validation errors:\s*$/}).locator('+ ul > li').first()).toBeVisible();
        await dashB.goto();
        await dashboardSearch(dashB, 'Okapi');
        await expect(dashB.row(OKAPI).first()).toBeVisible();
        await dashboardSearch(dashB, 'Wombat');
        await expect(dashB.row(WOMBAT)).toHaveCount(0);

        // Control: A's Dashboard still lists "Okapi field notes" in
        // "Production" (Side effects bullet 3); no email from the import
        // (Rule 10; Side effects bullet 1).
        const dashA = new EditorialDashboardPage(side, a);
        await dashA.goto();
        await dashboardSearch(dashA, 'Okapi');
        const rowA = dashA.row(OKAPI);
        await expect(rowA).toHaveCount(1);
        await expect(rowA.getByRole('cell').first()).toHaveText(new RegExp(`^\\s*${okapi.submissionId}\\s*$`));
        await expect(dashA.stageCell(rowA)).toContainText('Production');
        await expectNoMailBesidesControl(browser, baseURL, pkpMail, a, manager, [ada]);
    });
});
