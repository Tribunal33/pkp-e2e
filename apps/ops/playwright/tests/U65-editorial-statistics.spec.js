// @ts-check
/**
 * @file playwright/tests/U65-editorial-statistics.spec.js
 *
 * Statistics — editorial activity & reports — OPS suite, one test per
 * canonical scenario the spec runs on a preprint server: S1–S5 (common),
 * in the server's own words ("Preprint Server activity", "Manager",
 * "Moderator", the Editorial Board Member in the Copyeditor's place, the
 * one "Decline"), and S9 {OPS}, the server's analogue of S6 and S7. S6 and
 * S7 are {OJS OMP}, S8 {OJS}. A preprint server has no Reviewer, so S1 has
 * none, and no "Submissions Accepted" row, so S3 and S5 seed no accepted
 * preprint ("Caribou" is {OJS OMP}).
 * Spec: docs/specs/U65-editorial-statistics.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A6: S2 reads that "Users" lists "Site Administrator", never its figure.
 * - A9: S3 reads the attachment's "Active Submissions" block's heading
 *   line, never its counts.
 * - A11: S3 reads the email's closing from "A full copy of this month's
 *   trends is attached." on, never the "Login to the …" sentence.
 * - OPS4: S3 never reads the figure after "Accepted submissions this
 *   month:".
 * - A14: S4 leaves the Moderator's Notifications tab without saving.
 * - A1–A5, A7, A8, A10, A12, A13: not on these scenarios' paths. OJS and
 *   OMP IDs are the journal's and the press's. OPS3 (❓) is read as S9
 *   states the page today (no link, "No Items").
 *
 * Seeding (footnote sc): every scenario builds its own scratch server with
 * `POST scenarios/context` (throwaway accounts, the password the username
 * twice) and its preprints with `POST scenarios/submission`, a throwaway
 * Author as submitter; "received on" a day is `dateSubmitted`, which moves
 * the seed's decisions and posting to that day; "declined" is `decline`,
 * "posted" `published: true`, an imported preprint `published` with a
 * `datePublished` before its `dateSubmitted`, a draft `submitted: false`.
 * The scratch names ("Axolotl", "Nova") carry the test's tag. `admin` is
 * enrolled as a Manager in every scratch server: it counts under "Users".
 * The monthly run is `POST scenarios/task` `statisticsReport` for the one
 * server (scoped to it, so it runs in the parallel project), and its
 * emails are read by the throwaways' own addresses (A8). S4's switch back
 * on is the scenario's own step, on screen.
 *
 * Every absence is read settled and paired with a positive control read
 * the same way (M4, M6): the access-denied pages with the manager's own
 * pages; a missing email with another recipient's email of the same run
 * (the bound) and a count of the account's own; a missing Tasks entry with
 * the grid drawn and another account's entry read the same way; the
 * missing chart with "Trends" drawn; the missing report links with the
 * page's line; the empty "Report Plugins" with the list's other groups.
 * The range reads wait on the page's three GETs (`EditorialActivityPage`).
 * Waits are web-first (A5); the one page timer waits out the modal store's
 * slot after the export window closes (patterns.md pitfall 4).
 */
const {test, expect} = require('../support/fixtures.js');
const {EditorialChrome} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {TasksPanel, UnsubscribePage} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {ProfilePage} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {WorkflowEmailsSettingsPage} = require('../../../../shared/playwright/pages/EmailsPages.js');
const {WebsitePluginsPage} = require('../../../../shared/playwright/pages/PluginsPages.js');
const {utcDay} = require('../../../../shared/playwright/pages/UsageStatsPages.js');
const {
    EditorialActivityPage,
    UserStatsPage,
    EditorialReportsPage,
    statsAddresses,
    expectAccessDenied,
    csvBlocks,
    asRecord,
    statisticsEmails,
    statisticsEmailCount,
} = require('../../../../shared/playwright/pages/EditorialStatsPages.js');

const T = 30_000;

// ---- the preprint server's words (Fields) -----------------------------------------------
/** A preprint server's four "Trends" rows (OPS2). */
const TRENDS = ['Submissions Received', 'Submissions Declined', 'Submissions Published', 'Other Submissions'];
const USER_ROWS = ['All Users', 'Site Administrator', 'Manager', 'Moderator', 'Assistant', 'Author', 'Reviewer', 'Reader'];
/** The server's roles, as Settings › Users & Roles › "Roles" names them. */
const ROLES = ['Preprint Server manager', 'Moderator', 'Author', 'Reader', 'Editorial Board Member'];
const USER_COLUMNS = ['ID', 'Given Name', 'Family Name', 'Email address', 'Phone', 'Country', 'Mailing Address', 'Date registered', 'Updated', ...ROLES];
const REPORTS_LINE =
    'The system generates reports that track the details associated with site usage and submissions over a given period of time. Reports are generated in CSV format which requires a spreadsheet application to view.';
const TASK_SENTENCE = "This is a kind reminder for you to check your publication's health through the editorial report.";
const STATS_ROW = 'Statistics report summary.';

// ---- dates (the fleets run PHP in UTC) ----------------------------------------------------
const NOW = new Date();
const YEAR = NOW.getUTCFullYear();
const LAST_YEAR = YEAR - 1;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Day `d` of the previous month, `YYYY-MM-DD`. */
function previousMonth(d) {
    return new Date(Date.UTC(YEAR, NOW.getUTCMonth() - 1, d)).toISOString().slice(0, 10);
}
/** "{month}, {year}" of the previous month, as the email writes it ("August, 2026"). */
const PREVIOUS_MONTH = (() => {
    const d = new Date(Date.UTC(YEAR, NOW.getUTCMonth() - 1, 1));
    return `${MONTHS[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
})();
const SUBJECT = `Preprint Server activity for ${PREVIOUS_MONTH}`;
const TODAY = utcDay(0);
/** The middle column's heading for a range. */
const RANGE = (from, to) => `${from} — ${to}`;

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u65${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account entry (`{username, givenName, familyName, roles}` plus extras). */
function person(username, givenName, familyName, roles, extra = {}) {
    return {username, givenName, familyName, roles, email: `${username}@mail.test`, ...extra};
}

const email = (username) => `${username}@mail.test`;

/** A page of `username`'s own browser. */
async function pageAs(asUser, username) {
    return (await asUser(username)).newPage();
}

/** A browser where nobody is signed in. */
async function signedOutPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    return context.newPage();
}

/** A seeded preprint of the scratch server. */
function seed(api, tag, key, title, submitter, extra = {}) {
    return api.createSubmission({tag: `${tag}${key}`, context: tag, submitter, title: `${title} ${tag}`, ...extra});
}

/** The editorial side menu of `page`'s server is drawn; returns the chrome. */
async function editorialChrome(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/submissions`);
    const chrome = new EditorialChrome(page);
    await chrome.waitSideMenu();
    return chrome;
}

/** The Tasks panel of the page's account on the scratch server, open; the bell's count read first. */
async function openTasks(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/submissions`);
    const panel = new TasksPanel(page);
    await expect(panel.bell()).toBeVisible({timeout: T});
    const bell = await panel.count();
    await panel.open();
    return {panel, bell};
}

test.describe('Statistics — editorial activity & reports', () => {
    test('S1: roles kept off the editorial statistics pages', async ({asUser, opsApi, browser, baseURL}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s1', testInfo);
        const u = {
            manager: `${tag}mg`,
            author: `${tag}au`,
            reader: `${tag}rd`,
            board: `${tag}eb`,
            ended: `${tag}ex`,
        };
        await opsApi.createContext({
            tag,
            users: [
                person(u.manager, 'Mona', 'Manager', ['manager']),
                person(u.author, 'Ada', 'Author', ['author']),
                person(u.reader, 'Rita', 'Reader', ['reader']),
                person(u.board, 'Bea', 'Board', ['editorialBoardMember']),
                person(u.ended, 'Ed', 'Ended', [], {pastRoles: [{role: 'reader', dateStart: utcDay(7), dateEnd: utcDay(1)}]}),
            ],
        });

        // The addresses as the scratch server's Manager's side menu holds
        // them (footnote b); the control reads them below.
        const mgPage = await pageAs(asUser, u.manager);
        await editorialChrome(mgPage, tag);
        const addresses = await statsAddresses(mgPage);
        const editorialAddress = addresses['Editorial Activity'];
        const usersAddress = addresses['Users'];
        const reportsAddress = addresses['Reports'];
        expect(editorialAddress).toMatch(new RegExp(`/index\\.php/${tag}/stats/editorial`));
        expect(usersAddress).toMatch(new RegExp(`/index\\.php/${tag}/stats/users`));
        expect(reportsAddress).toMatch(new RegExp(`/index\\.php/${tag}/stats/reports$`));
        const three = [
            ['Editorial Activity', editorialAddress],
            ['Users', usersAddress],
            ['Reports', reportsAddress],
        ];

        // Author, Reader and Editorial Board Member: the access-denied page
        // at each address (Actors rows 1, 3).
        for (const username of [u.author, u.reader, u.board]) {
            const page = await pageAs(asUser, username);
            for (const [name, address] of three) {
                await page.goto(address);
                await expectAccessDenied(page, `${username} on ${name}`);
            }
        }

        // The Reader whose role ended and the seeded server's Manager, who
        // holds no role here: the same page at "Editorial Activity" and
        // "Users" (Actors row 1).
        for (const username of [u.ended, 'manager.maya']) {
            const page = await pageAs(asUser, username);
            for (const [name, address] of three.slice(0, 2)) {
                await page.goto(address);
                await expectAccessDenied(page, `${username} on ${name}`);
            }
        }

        // Signed out: the Login page at each address (Actors rows 1, 3).
        const visitor = await signedOutPage(browser, baseURL);
        for (const [name, address] of three) {
            await visitor.goto(address);
            await expect(visitor, `signed out on ${name}`).toHaveURL(/\/login(\?|$)/, {timeout: T});
            await expect(visitor.locator('form#login')).toBeVisible();
        }
        await visitor.context().close();

        // Control: the Manager opens each page: "Editorial Activity" with its
        // "Trends", "Users" with its heading, "Reports" with its heading
        // "Reports" (the chart is {OJS OMP}; S9 reads its absence).
        const editorial = new EditorialActivityPage(mgPage, tag);
        await editorial.goto(editorialAddress);
        await expect(mgPage).not.toHaveURL(/authorizationDenied/);
        await expect(editorial.trends).toBeVisible();
        const users = new UserStatsPage(mgPage, tag);
        await users.goto(usersAddress);
        await expect(users.heading).toBeVisible();
        const reports = new EditorialReportsPage(mgPage, tag);
        await reports.goto(reportsAddress);
        await expect(reports.heading).toHaveText('Reports');
    });

    test('S2: counting and exporting the journal\'s users', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s2', testInfo);
        const u = {
            manager: `${tag}mg`,
            se: `${tag}se`,
            nova: `${tag}nova`,
            otto: `${tag}otto`,
            cora: `${tag}cora`,
            pia: `${tag}pia`,
            quinn: `${tag}quinn`,
        };
        await opsApi.createContext({
            tag,
            users: [
                person(u.manager, 'Mona', 'Manager', ['manager']),
                person(u.se, 'Sid', 'Moderator', ['sectionEditor']),
                person(u.nova, 'Nova', 'Nilsen', ['author', 'reader']),
                person(u.otto, 'Otto', 'Olsen', ['author']),
                person(u.cora, 'Cora', 'Copper', ['editorialBoardMember']),
                person(u.pia, 'Pia', 'Pardo', ['author'], {disabled: true}),
                person(u.quinn, 'Quinn', 'Quist', [], {pastRoles: [{role: 'reader', dateStart: utcDay(7), dateEnd: utcDay(1)}]}),
            ],
        });
        const expectedRows = [
            ['All Users', '6'],
            ['Manager', '2'],
            ['Moderator', '1'],
            ['Assistant', '1'],
            ['Author', '2'],
            ['Reviewer', '0'],
            ['Reader', '1'],
        ];
        /** The rows but "Site Administrator", whose figure is A6's. */
        const readCounts = async (users) => (await users.readRows()).filter(([name]) => name !== 'Site Administrator');

        // "Users" from the side menu: tab title, heading with "Export",
        // columns, rows in order with their counts (Rules 14, 15; Fields).
        const page = await pageAs(asUser, u.manager);
        const chrome = await editorialChrome(page, tag);
        await chrome.chooseSideEntry('Statistics', 'Users');
        const users = new UserStatsPage(page, tag);
        await users.arrived();
        await expect(page).toHaveTitle(/^User Statistics/);
        await expect(users.heading).toHaveText('Registered users');
        await expect(users.exportButton).toBeVisible();
        const headingBox = await users.heading.boundingBox();
        const exportBox = await users.exportButton.boundingBox();
        expect(exportBox.x, '"Export" stands at the heading\'s right').toBeGreaterThan(headingBox.x + headingBox.width);
        await expect(users.columnHeaders()).toHaveText(['Name', 'Total']);
        expect((await users.readRows()).map(([name]) => name)).toEqual(USER_ROWS);
        expect(await readCounts(users)).toEqual(expectedRows);

        // The export window: title, "User Group" with its line, one box per
        // role, every one ticked, and "Export" (Rule 16; Fields).
        let win = await users.openExport();
        await expect(win.group).toBeVisible();
        await expect(win.description).toBeVisible();
        expect(await win.boxStates()).toEqual(ROLES.map((r) => [r, true]));
        await expect(win.exportButton).toBeVisible();
        const viewport = page.viewportSize();
        const at = await win.position();
        expect(Math.round(at.x + at.width), 'the window stands against the right edge').toBeGreaterThanOrEqual(viewport.width - 2);

        // Every role exported: the window closes, the file downloads with
        // its BOM, columns and one line per current account (Rule 17; Fields).
        const all = await win.export();
        expect(all.name).toBe(`user-report-${TODAY}.csv`);
        expect(all.bom, 'the file starts with a byte-order mark').toBe(true);
        expect(all.rows[0]).toEqual(USER_COLUMNS);
        const lines = all.rows.slice(1).map((r) => asRecord(all.rows[0], r));
        expect(lines.map((l) => l['Email address']).sort()).toEqual(
            ['admin@mail.test', email(u.manager), email(u.se), email(u.nova), email(u.otto), email(u.cora)].sort()
        );
        expect(lines.find((l) => l['Email address'] === email(u.pia)), 'no line for Pia').toBeUndefined();
        expect(lines.find((l) => l['Email address'] === email(u.quinn)), 'no line for Quinn').toBeUndefined();
        const nova = lines.find((l) => l['Email address'] === email(u.nova));
        for (const role of ROLES) expect(nova[role], `Nova under "${role}"`).toBe(['Author', 'Reader'].includes(role) ? 'Yes' : 'No');
        expect(nova['Date registered']).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        expect([nova['Phone'], nova['Country'], nova['Mailing Address']]).toEqual(['', '', '']);

        // One role exported: the boxes as left (all ticked); "Author" alone
        // gives Nova and Otto, the role columns unchanged (Rules 16, 17).
        win = await users.openExport();
        expect(await win.boxStates()).toEqual(ROLES.map((r) => [r, true]));
        await win.tickOnly(['Author']);
        const authors = await win.export();
        expect(authors.rows[0]).toEqual(USER_COLUMNS);
        expect(authors.rows.slice(1).map((r) => asRecord(authors.rows[0], r)['Email address']).sort()).toEqual([email(u.nova), email(u.otto)].sort());

        // No role exported: "Author" alone ticked, as last left; unticked,
        // the window still exports and the file holds the column names alone
        // (Rules 16, 17).
        win = await users.openExport();
        expect(await win.boxStates()).toEqual(ROLES.map((r) => [r, r === 'Author']));
        await win.tickOnly([]);
        const none = await win.export();
        expect(none.bom).toBe(true);
        expect(none.rows).toEqual([USER_COLUMNS]);

        // The Moderator: the same rows with the same counts (Actors
        // paragraph).
        const sePage = await pageAs(asUser, u.se);
        const seChrome = await editorialChrome(sePage, tag);
        await seChrome.chooseSideEntry('Statistics', 'Users');
        const seUsers = new UserStatsPage(sePage, tag);
        await seUsers.arrived();
        expect((await seUsers.readRows()).map(([name]) => name)).toEqual(USER_ROWS);
        expect(await readCounts(seUsers)).toEqual(expectedRows);

        // Control: reloaded, the window opens with every box ticked again
        // (Rule 16).
        await users.reload();
        win = await users.openExport();
        expect(await win.boxStates()).toEqual(ROLES.map((r) => [r, true]));
        await win.close();
    });

    test('S3: the monthly statistics email', async ({asUser, opsApi, pkpMail, browser, baseURL}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s3', testInfo);
        const u = {maya: `${tag}maya`, sol: `${tag}sol`, tess: `${tag}tess`, uma: `${tag}uma`, vic: `${tag}vic`, wes: `${tag}wes`};
        await opsApi.createContext({
            tag,
            users: [
                person(u.maya, 'Maya', 'Moss', ['manager']),
                person(u.sol, 'Sol', 'Sato', ['sectionEditor']),
                person(u.tess, 'Tess', 'Tran', ['sectionEditor'], {notifications: {notificationEditorialReport: {email: false}}}),
                person(u.uma, 'Uma', 'Ueda', ['sectionEditor'], {notifications: {notificationEditorialReport: {enabled: false}}}),
                person(u.vic, 'Vic', 'Vale', ['manager'], {disabled: true}),
                person(u.wes, 'Wes', 'West', ['author']),
            ],
        });
        await seed(opsApi, tag, 'ax', 'Axolotl', u.wes, {dateSubmitted: previousMonth(10)});
        await seed(opsApi, tag, 'bi', 'Bison', u.wes, {dateSubmitted: previousMonth(10)});
        await seed(opsApi, tag, 'eg', 'Egret', u.wes, {dateSubmitted: previousMonth(15), decisions: ['decline']});
        await seed(opsApi, tag, 'ke', 'Kea', u.wes);
        await opsApi.runTask({task: 'statisticsReport', context: tag});

        // Maya's and Sol's email: subject, opening, figures, closing,
        // signature and footer (Rules 24, 25; Fields; A11 and OPS4 unread).
        const [maya] = await statisticsEmails(pkpMail, email(u.maya));
        const [sol] = await statisticsEmails(pkpMail, email(u.sol));
        for (const [who, name, m] of [['Maya', 'Maya Moss', maya], ['Sol', 'Sol Sato', sol]]) {
            expect(m.subject, `${who}'s subject`).toBe(SUBJECT);
            const text = m.text.replace(/\r\n/g, '\n');
            expect(text.trimStart(), `${who}'s email opens with the name`).toMatch(new RegExp(`^${name},\\s*\\n`));
            expect(text).toContain(`Your preprint health report for ${PREVIOUS_MONTH} is now available. Your key stats for this month are below.`);
            expect(text).toMatch(/New submissions this month: 3\b/);
            expect(text).toMatch(/Declined submissions this month: 1\b/);
            expect(text).toMatch(/Total submissions in the system: 4\b/);
            const flat = text.replace(/\s*\(\s*https?:\/\/[^)]*\)/g, '').replace(/\s+/g, ' ');
            expect(flat).toContain("A full copy of this month's trends is attached.");
            expect(flat.indexOf('Sincerely,'), `${who}: "Sincerely," after the closing`).toBeGreaterThan(flat.indexOf('A full copy of'));
            expect(m.links.map((l) => l.text)).toContain('Unsubscribe');
            expect(flat.indexOf('Unsubscribe'), `${who}: the footer after "Sincerely,"`).toBeGreaterThan(flat.indexOf('Sincerely,'));
        }

        // The link: in Sol's email "trends" opens "Editorial Activity"
        // (Fields).
        const solPage = await pageAs(asUser, u.sol);
        const trendsLink = sol.links.find((l) => l.text === 'trends');
        expect(trendsLink, 'Sol\'s email links "trends"').toBeTruthy();
        const solStats = new EditorialActivityPage(solPage, tag);
        await solStats.goto(trendsLink.href);
        await expect(solPage).toHaveURL(new RegExp(`/index\\.php/${tag}/stats/editorial`));
        await expect(solPage).toHaveTitle(/^Editorial Activity/);

        // The attachment: BOM, three blocks (Rule 26; A9 unread).
        expect(sol.attachments.map((a) => a.name)).toEqual(['editorial-report.csv']);
        const report = sol.attachments[0];
        expect(report.bom, 'the attachment starts with a byte-order mark').toBe(true);
        const blocks = csvBlocks(report.rows);
        expect(blocks.map((b) => b[0])).toEqual([['Active Submissions', 'Total'], ['Trends', PREVIOUS_MONTH, 'Total'], ['Users', 'Total']]);
        const trendsBlock = Object.fromEntries(blocks[1].slice(1).map((r) => [r[0], r.slice(1)]));
        expect(trendsBlock['Submissions Received']).toEqual(['3', '4']);
        for (const [row, [, total]] of Object.entries(trendsBlock)) expect(total, `${row}'s total carries no yearly average`).toMatch(/^[\d.]+$/);
        expect(Object.fromEntries(blocks[2].slice(1))['All Users']).toBe('6');

        // Sol's Tasks entry: listed; pressed, it opens "Editorial Activity"
        // and the bell counts one fewer; it stays listed (Rule 27).
        let tasks = await openTasks(solPage, tag);
        await expect(tasks.panel.row(TASK_SENTENCE)).toHaveCount(1);
        const bellBefore = tasks.bell;
        await tasks.panel.openTask(tasks.panel.row(TASK_SENTENCE));
        await solStats.arrived();
        await expect(solPage).toHaveURL(new RegExp(`/index\\.php/${tag}/stats/editorial`));
        await new TasksPanel(solPage).expectCount(bellBefore - 1);
        tasks = await openTasks(solPage, tag);
        await expect(tasks.panel.row(TASK_SENTENCE)).toHaveCount(1);
        await tasks.panel.close();
        const bellAfterPress = tasks.bell;

        // Tess, Uma and Vic: Tess no email and the entry; Uma neither; Vic no
        // email. The bound: Maya's and Sol's emails of the same run, found
        // above (Actors row 4; Rule 28; Settings bullet 2).
        expect(await statisticsEmailCount(pkpMail, email(u.tess)), 'Tess gets no email').toBe(0);
        expect(await statisticsEmailCount(pkpMail, email(u.uma)), 'Uma gets no email').toBe(0);
        expect(await statisticsEmailCount(pkpMail, email(u.vic)), 'Vic gets no email').toBe(0);
        const tessPage = await pageAs(asUser, u.tess);
        const tessTasks = await openTasks(tessPage, tag);
        await expect(tessTasks.panel.row(TASK_SENTENCE)).toHaveCount(1);
        const umaPage = await pageAs(asUser, u.uma);
        const umaTasks = await openTasks(umaPage, tag);
        await expect(umaTasks.panel.grid()).toBeVisible();
        await expect(umaTasks.panel.row(TASK_SENTENCE)).toHaveCount(0);

        // Sol's "Unsubscribe": the page lists the emails, "Statistics report
        // summary." among them, each ticked; "Unsubscribe" leaves the
        // Profile row at "Do not send me an email…" ticked (Rule 28a).
        const unsubscribeLink = sol.links.find((l) => l.text === 'Unsubscribe');
        const reader = await signedOutPage(browser, baseURL);
        const unsubscribe = new UnsubscribePage(reader);
        await unsubscribe.goto(unsubscribeLink.href);
        const labels = await unsubscribe.boxLabels();
        expect(labels).toContain(STATS_ROW);
        expect(labels).toContain('Weekly email of outstanding tasks');
        const boxes = await unsubscribe.boxes().evaluateAll((bs) => bs.map((b) => /** @type {HTMLInputElement} */ (b).checked));
        expect(boxes.length).toBe(labels.length);
        expect(boxes.every(Boolean), 'every box ticked').toBe(true);
        await expect(unsubscribe.box('emailNotificationEditorialReport')).toBeChecked();
        await unsubscribe.unsubscribe();
        await expect(unsubscribe.successHeading).toBeVisible({timeout: T});
        await reader.context().close();
        const profile = new ProfilePage(solPage, tag);
        await profile.goto('notifications');
        const pair = profile.notificationPair('notificationEditorialReport');
        await expect(pair.allow).toBeChecked();
        await expect(pair.email).toBeChecked();

        // A second run: Maya gets a second email, Sol none; Sol's panel lists
        // two entries and the bell counts one more (Rules 27, 28a).
        await opsApi.runTask({task: 'statisticsReport', context: tag});
        await statisticsEmails(pkpMail, email(u.maya), {atLeast: 2});
        expect(await statisticsEmailCount(pkpMail, email(u.maya))).toBe(2);
        expect(await statisticsEmailCount(pkpMail, email(u.sol)), 'Sol gets no second email').toBe(1);
        tasks = await openTasks(solPage, tag);
        await expect(tasks.panel.row(TASK_SENTENCE)).toHaveCount(2);
        expect(tasks.bell, 'the bell counts one more').toBe(bellAfterPress + 1);
        await tasks.panel.close();

        // Control: Wes gets neither the email nor the entry after either run,
        // read the way Sol's were (Actors row 4).
        expect(await statisticsEmailCount(pkpMail, email(u.wes)), 'Wes gets no email').toBe(0);
        const wesPage = await pageAs(asUser, u.wes);
        const wesTasks = await openTasks(wesPage, tag);
        await expect(wesTasks.panel.grid()).toBeVisible();
        await expect(wesTasks.panel.row(TASK_SENTENCE)).toHaveCount(0);
    });

    test('S4: a journal that sends no monthly email', async ({asUser, opsApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const u = {manager: `${tag}mg`, se: `${tag}se`, author: `${tag}au`};
        await opsApi.createContext({
            tag,
            editorialStatsEmail: false,
            users: [
                person(u.manager, 'Mona', 'Manager', ['manager']),
                person(u.se, 'Sid', 'Moderator', ['sectionEditor']),
                person(u.author, 'Ada', 'Author', ['author']),
            ],
        });
        await seed(opsApi, tag, 'ax', 'Axolotl', u.author, {dateSubmitted: previousMonth(10)});

        // The Moderator's Profile: "Editors" has no "Statistics report
        // summary." row; the group's other row is the control. Left without
        // saving (Settings bullet 1; A14).
        const sePage = await pageAs(asUser, u.se);
        const profile = new ProfilePage(sePage, tag);
        await profile.goto('notifications');
        let editors = (await profile.notificationTable()).find((g) => g.group === 'Editors');
        expect(editors, 'the group "Editors"').toBeTruthy();
        expect(editors.rows).toContain('Weekly email of outstanding tasks');
        expect(editors.rows).not.toContain(STATS_ROW);
        await expect(profile.notificationRow(STATS_ROW)).toHaveCount(0);

        // A run while off: no Tasks entry now; no email to either, counted
        // after the run while on below (Rules 24, 27; Settings bullet 1).
        await opsApi.runTask({task: 'statisticsReport', context: tag});
        let tasks = await openTasks(sePage, tag);
        await expect(tasks.panel.grid()).toBeVisible();
        await expect(tasks.panel.row(TASK_SENTENCE)).toHaveCount(0);
        await tasks.panel.close();

        // Switched back on, on screen, by the Manager.
        const mgPage = await pageAs(asUser, u.manager);
        const emails = new WorkflowEmailsSettingsPage(mgPage, tag);
        await emails.goto();
        await expect(emails.panel.getByRole('group', {name: 'Editorial statistics'})).toBeVisible();
        expect(await emails.checkedValue('editorialStatsEmail')).toBe('false');
        await emails.radioByLabel('Send a monthly email to editors.').check();
        await emails.save();

        // The row returns, "Enable…" ticked and "Do not send…" unticked
        // (Settings bullets 1, 2).
        await profile.goto('notifications');
        editors = (await profile.notificationTable()).find((g) => g.group === 'Editors');
        expect(editors.rows).toContain(STATS_ROW);
        const pair = profile.notificationPair('notificationEditorialReport');
        await expect(pair.allow).toBeChecked();
        await expect(pair.email).not.toBeChecked();

        // A run while on: the email to both, "New submissions this month: 1",
        // and the Tasks entry; one email each, so the run while off sent none
        // (Rules 24, 25, 27).
        await opsApi.runTask({task: 'statisticsReport', context: tag});
        for (const username of [u.manager, u.se]) {
            const [m] = await statisticsEmails(pkpMail, email(username));
            expect(m.subject).toBe(SUBJECT);
            expect(m.text).toMatch(/New submissions this month: 1\b/);
            expect(await statisticsEmailCount(pkpMail, email(username)), `${username}: one email from the two runs`).toBe(1);
        }
        tasks = await openTasks(sePage, tag);
        await expect(tasks.panel.row(TASK_SENTENCE)).toHaveCount(1);

        // Control: the Author gets no email from either run, bounded by the
        // Manager's (Actors row 4).
        expect(await statisticsEmailCount(pkpMail, email(u.author)), 'the Author gets no email').toBe(0);
    });

    test('S5: yearly averages in "Total"', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const u = {manager: `${tag}mg`, author: `${tag}au`};
        await opsApi.createContext({
            tag,
            users: [person(u.manager, 'Mona', 'Manager', ['manager']), person(u.author, 'Ada', 'Author', ['author'])],
        });
        await seed(opsApi, tag, 'al', 'Alpha', u.author, {dateSubmitted: `${YEAR - 3}-03-01`});
        await seed(opsApi, tag, 'be', 'Beta', u.author, {dateSubmitted: `${YEAR - 2}-03-01`});
        await seed(opsApi, tag, 'ga', 'Gamma', u.author, {dateSubmitted: `${YEAR - 2}-03-01`, decisions: ['decline']});
        await seed(opsApi, tag, 'de', 'Delta', u.author, {dateSubmitted: `${LAST_YEAR}-03-01`});
        await seed(opsApi, tag, 'ep', 'Epsilon', u.author, {dateSubmitted: `${LAST_YEAR}-03-01`});
        await seed(opsApi, tag, 'ze', 'Zeta', u.author);

        // "Total": the averages and their absence (Rules 8, 8a).
        const page = await pageAs(asUser, u.manager);
        const stats = new EditorialActivityPage(page, tag);
        await stats.goto();
        const totals = {
            'Submissions Received': '6 (2/year)',
            'Submissions Declined': '1',
            'Submissions Published': '0',
        };
        await stats.expectColumn('total', totals);

        // "Last two years": the heading and the range's figures; "Total"
        // unchanged (Rules 3, 7, 8c).
        await stats.choosePreset('Last two years');
        await expect(stats.trendsColumns()).toHaveText(['Name', RANGE(`${YEAR - 2}-01-01`, `${LAST_YEAR}-12-31`), 'Total']);
        await stats.expectColumn('middle', {'Submissions Received': 4, 'Submissions Declined': 1});
        await stats.expectColumn('total', totals);

        // "Last year" (Rules 3, 7).
        await stats.choosePreset('Last year');
        await expect(stats.trendsColumns()).toHaveText(['Name', RANGE(`${LAST_YEAR}-01-01`, `${LAST_YEAR}-12-31`), 'Total']);
        await stats.expectColumn('middle', {'Submissions Received': 2, 'Submissions Declined': 0});
        await stats.expectColumn('total', totals);

        // Control: "Year to date" ends yesterday, and "Zeta" arrived today
        // (Rules 3, 7).
        await stats.choosePreset('Year to date');
        await expect(stats.trendsColumns()).toHaveText(['Name', RANGE(`${YEAR}-01-01`, utcDay(1)), 'Total']);
        await stats.expectColumn('middle', {'Submissions Received': 0});
    });

    test('S9: a preprint server\'s editorial statistics', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s9', testInfo);
        const u = {manager: `${tag}mg`, author: `${tag}au`};
        await opsApi.createContext({
            tag,
            users: [person(u.manager, 'Mona', 'Manager', ['manager']), person(u.author, 'Ada', 'Author', ['author'])],
        });
        const LY = LAST_YEAR;
        await seed(opsApi, tag, 'ax', 'Axolotl', u.author, {dateSubmitted: `${LY}-03-15`});
        await seed(opsApi, tag, 'bi', 'Bison', u.author, {dateSubmitted: `${LY}-03-15`});
        await seed(opsApi, tag, 'eg', 'Egret', u.author, {dateSubmitted: `${LY}-07-12`, decisions: ['decline']});
        await seed(opsApi, tag, 'ge', 'Gecko', u.author, {dateSubmitted: `${LY}-09-03`, published: true});
        await seed(opsApi, tag, 'he', 'Heron', u.author, {dateSubmitted: `${LY}-09-20`, published: true, datePublished: `${LY}-02-01`});
        await seed(opsApi, tag, 'ib', 'Ibis', u.author, {submitted: false});

        // "Editorial Activity": "Trends" drawn and no chart beside it (OPS1);
        // four rows in order (OPS2); "Total" 4, 1, 1, 2 with no yearly
        // average; the middle column 0 on every row (Rules 2, 6, 6a, 7b, 8a, 13).
        const page = await pageAs(asUser, u.manager);
        const stats = new EditorialActivityPage(page, tag);
        await stats.goto();
        await expect(page).toHaveTitle(/^Editorial Activity/);
        await expect(stats.trendsHeading).toContainText('Trends');
        await expect(stats.trendsColumns()).toHaveText(['Name', RANGE(utcDay(91), utcDay(1)), 'Total']);
        await expect(stats.chart, 'no active submissions chart').toHaveCount(0);
        await expect(page.locator('main canvas'), 'nothing drawn on the page').toHaveCount(0);
        await expect(stats.totalHeading).toHaveCount(0);
        await stats.expectRowNames(TRENDS);
        const totals = {
            'Submissions Received': '4',
            'Submissions Declined': '1',
            'Submissions Published': '1',
            'Other Submissions': '2',
        };
        await stats.expectColumn('total', totals);
        await expect.poll(() => stats.columnValues('middle'), {timeout: T}).toEqual(['0', '0', '0', '0']);

        // "Last year": the middle column 4, 1, 1, 1; "Total" kept (Rules 3, 7).
        await stats.choosePreset('Last year');
        await expect(stats.trendsColumns()).toHaveText(['Name', RANGE(`${LY}-01-01`, `${LY}-12-31`), 'Total']);
        await stats.expectColumn('middle', {
            'Submissions Received': 4,
            'Submissions Declined': 1,
            'Submissions Published': 1,
            'Other Submissions': 1,
        });
        await stats.expectColumn('total', totals);
        await stats.expectRowNames(TRENDS);

        // "Reports" from the side menu: the heading, the line, and no link
        // after it (Rule 18; OPS3).
        const chrome = await editorialChrome(page, tag);
        const addresses = await statsAddresses(page);
        await chrome.chooseSideEntry('Statistics', 'Reports');
        const reports = new EditorialReportsPage(page, tag);
        await reports.arrived();
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tag}/stats/reports$`));
        await expect(reports.heading).toHaveText('Reports');
        await expect(reports.line).toHaveText(REPORTS_LINE);
        await expect(reports.links, 'no report link').toHaveCount(0);

        // Settings › Website › "Plugins": "Report Plugins" reads "No Items",
        // beside the list's other groups and their rows (Rule 18).
        const plugins = new WebsitePluginsPage(page, tag);
        await plugins.goto();
        const outline = await plugins.list.read();
        const reportGroup = outline.find((c) => c.heading === 'Report Plugins');
        expect(reportGroup, 'the "Report Plugins" group').toBeTruthy();
        expect(reportGroup.rows).toEqual([]);
        expect(reportGroup.empty).toBe('No Items');
        expect(outline.filter((c) => c.rows.length > 0).length, 'other groups list their plugins').toBeGreaterThan(0);

        // Control: the side menu's "Statistics" group offers "Reports", the
        // address the page above opened (Actors row 3).
        expect(Object.keys(addresses)).toContain('Reports');
        expect(addresses['Reports']).toMatch(new RegExp(`/index\\.php/${tag}/stats/reports$`));
    });
});
