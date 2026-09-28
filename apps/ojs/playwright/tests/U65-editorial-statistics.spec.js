// @ts-check
/**
 * @file playwright/tests/U65-editorial-statistics.spec.js
 *
 * Statistics — editorial activity & reports — OJS suite, one test per
 * canonical scenario the spec runs on a journal: S1–S5 (common), S6 and
 * S7 {OJS OMP}, S8 {OJS}. S9 is the preprint server's.
 * Spec: docs/specs/U65-editorial-statistics.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A5: S6 reads the information icons with the pointer only.
 * - A6: S2 reads that "Users" lists "Site Administrator", never its figure.
 * - A9: S3 reads the attachment's "Active Submissions" block's heading
 *   line, never its counts.
 * - A14: S4 leaves the Section Editor's Notifications tab without saving.
 * - OJS3: S7 reads the dates of "Marsh survey"'s two decisions and that
 *   each decision cell is filled, never a decision's name.
 * - OJS4: S8 gives the institutional contact a country first.
 * - A1–A4, A7, A8, A10–A13, OJS1, OJS2: not on these scenarios' paths
 *   (A3's open half, drafts started within a range, is never met: S6's
 *   only draft is started today). OMP and OPS IDs are the press's and the
 *   server's.
 *
 * Seeding (footnote sc): every scenario builds its own scratch journal
 * with `POST scenarios/context` (throwaway accounts, the password the
 * username twice) and its submissions with `POST scenarios/submission`,
 * a throwaway Author as submitter; "received on" a day is
 * `dateSubmitted`, which moves the seed's decisions and publication to
 * that day. The scratch names ("Axolotl", "Nova") carry the test's tag.
 * `admin` is enrolled as a Journal Manager in every scratch journal: it
 * counts under "Users", and it is "Marsh survey"'s editor in S7. The
 * monthly run is `POST scenarios/task` `statisticsReport` for the one
 * journal (scoped to it, so it runs in the parallel project), and its
 * emails are read by the throwaways' own addresses (A8). One state is
 * made on screen as the spec says: Pat's country in S8 (Profile ›
 * "Contact"; no key sets an account's country), and S4's switch back on
 * and S6's "Revert Decline" are the scenarios' own steps.
 *
 * Every absence is read settled and paired with a positive control read
 * the same way (M4, M6): the access-denied pages with the manager's own
 * pages; a missing email with another recipient's email of the same run
 * (the bound) and a count of the account's own; a missing Tasks entry
 * with the grid drawn and another account's entry read the same way; a
 * missing report line with the file's other lines. The range and filter
 * reads wait on the page's three GETs (`EditorialActivityPage`); the
 * chart's missing ring is read once Chart.js has sized its canvas. Waits
 * are web-first (A5); the one page timer waits out the modal store's
 * slot after the export window closes (patterns.md pitfall 4).
 */
const {test, expect} = require('../support/fixtures.js');
const {EditorialChrome} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {DecisionWizardPage} = require('../pages/DecisionWizardPages.js');
const {TasksPanel, UnsubscribePage} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {ProfilePage} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {WorkflowEmailsSettingsPage} = require('../../../../shared/playwright/pages/EmailsPages.js');
const {WebsitePluginsPage} = require('../../../../shared/playwright/pages/PluginsPages.js');
const {utcDay} = require('../../../../shared/playwright/pages/UsageStatsPages.js');
const {
    EditorialActivityPage,
    UserStatsPage,
    EditorialReportsPage,
    downloadFromLink,
    statsAddresses,
    expectAccessDenied,
    csvBlocks,
    asRecord,
    emailHeadings,
    byLabel,
    userExportHeader,
    statisticsEmails,
    statisticsEmailCount,
} = require('../../../../shared/playwright/pages/EditorialStatsPages.js');

const T = 30_000;

// ---- the journal's words (Fields) --------------------------------------------------------
const STAGES = ['Submission', 'Review', 'Copyediting', 'Production'];
const TRENDS = [
    'Submissions Received',
    'Submissions Accepted',
    'Submissions Declined',
    'Submissions Declined (Desk Reject)',
    'Submissions Declined (After Review)',
    'Submissions Published',
    'Other Submissions',
    'Submissions In Progress',
    'Imported Submissions',
    'Days to First Editorial Decision',
    'Days to Accept',
    'Days to Reject',
    'Acceptance Rate',
    'Rejection Rate',
    'Desk Reject Rate',
    'After Review Reject Rate',
];
const SUB_ROWS = [
    'Submissions Declined (Desk Reject)',
    'Submissions Declined (After Review)',
    'Submissions In Progress',
    'Imported Submissions',
    'Days to Accept',
    'Days to Reject',
    'Desk Reject Rate',
    'After Review Reject Rate',
];
const PRESETS = ['Last 90 days', 'Year to date', 'Last year', 'Last two years'];
const USER_ROWS = ['All Users', 'Site Administrator', 'Journal Manager', 'Section Editor', 'Assistant', 'Author', 'Reviewer', 'Reader', 'Subscription Manager'];
/** The journal's roles, as Settings › Users & Roles › "Roles" names them. */
const ROLES = [
    'Journal manager',
    'Journal editor',
    'Production editor',
    'Section editor',
    'Guest editor',
    'Copyeditor',
    'Designer',
    'Funding coordinator',
    'Indexer',
    'Layout Editor',
    'Marketing and sales coordinator',
    'Proofreader',
    'Author',
    'Translator',
    'Reviewer',
    'Reader',
    'Subscription Manager',
    'Editorial Board Member',
];
const USER_COLUMNS = ['ID', 'Given Name', 'Family Name', 'Email address', 'Phone', 'Country', 'Mailing Address', 'Date registered', 'Updated', ...ROLES];
const REPORT_LINKS = ['COUNTER Reports', 'Review Report', 'Articles Report', 'Subscriptions Report'];
const REPORTS_LINE =
    'The system generates reports that track the details associated with site usage and submissions over a given period of time. Reports are generated in CSV format which requires a spreadsheet application to view.';
const TASK_SENTENCE = "This is a kind reminder for you to check your publication's health through the editorial report.";
const STATS_ROW = 'Statistics report summary.';
const ICON_OTHER =
    'This includes submissions that are not counted in other totals, such as those that are still in progress and those that appear to have been imported.';
const ICON_RATE =
    'The percentage for the selected date range is calculated for submissions that were submitted during this date range and have received a final decision.';
const ICON_DAYS =
    'The number of days it takes for most submissions to receive the first editorial decision, such as desk rejection or send for review.';

const AUTHOR_COLUMNS = (n) =>
    ['Given Name', 'Family Name', 'ORCID iD', 'Country', 'Affiliation', 'Email address', 'Homepage URL', 'Bio Statement (e.g., department and rank)'].map(
        (c) => `${c} (Author ${n})`
    );
const ARTICLE_MIDDLE = ['Section title', 'Language', 'Coverage', 'Rights', 'Source', 'Subjects', 'Type', 'Disciplines', 'Keywords', 'Supporting Agencies', 'Status', 'URL', 'DOI', 'Date submitted', 'Last modified', 'First published'];
const EDITOR_COLUMNS = (n) => ['Given Name', 'Family Name', 'ORCID iD', 'Email address'].map((c) => `${c} (Editor ${n})`);
const DECISION_COLUMNS = (n, d) => [`Editor Decision ${d}  (Editor ${n})`, `Date decided ${d}  (Editor ${n})`];
const REVIEW_COLUMNS = [
    'Stage', 'Round', 'Submission Title', 'Submission ID', 'Reviewer', 'Given Name', 'Family Name', 'ORCID iD', 'Country', 'Affiliation', 'Email address',
    'Reviewing interests', 'Date Assigned', 'Date Notified', 'Date Confirmed', 'Date Completed', 'Date Acknowledged', 'Consideration', 'Date Reminded',
    'Response Due Date', 'Response Overdue Days', 'Review Due Date', 'Review Overdue Days', 'Declined', 'Cancelled', 'Recommendation', 'Comments On Submission',
];
const SUBS_INDIVIDUAL = ['ID', 'Status', 'Type', 'Format', 'Start', 'End', 'Membership', 'Reference Number', 'Notes', 'Name', 'Mailing Address', 'Country', 'Email address', 'Phone'];
const SUBS_INSTITUTIONAL = [...SUBS_INDIVIDUAL.slice(0, 9), 'Institution Name', 'Institution Mailing Address', 'Domain', 'IP Ranges', 'Contact Name', 'Mailing Address', 'Country', 'Email address', 'Phone'];

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
const TODAY = utcDay(0);
const COMPACT_TODAY = TODAY.replace(/-/g, '');
/** The middle column's heading for a range. */
const RANGE = (from, to) => `${from} — ${to}`;

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u65${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
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

/** A seeded submission of the scratch journal. */
function seed(api, tag, key, title, submitter, extra = {}) {
    return api.createSubmission({tag: `${tag}${key}`, context: tag, submitter, title: `${title} ${tag}`, ...extra});
}

/** The editorial side menu of `page`'s journal is drawn; returns the chrome. */
async function editorialChrome(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/submissions`);
    const chrome = new EditorialChrome(page);
    await chrome.waitSideMenu();
    return chrome;
}

/** The Tasks panel of `username` on the scratch journal, open; the bell's count read first. */
async function openTasks(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/submissions`);
    const panel = new TasksPanel(page);
    await expect(panel.bell()).toBeVisible({timeout: T});
    const bell = await panel.count();
    await panel.open();
    return {panel, bell};
}

test.describe('Statistics — editorial activity & reports', () => {
    test('S1: roles kept off the editorial statistics pages', async ({asUser, ojsApi, browser, baseURL}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s1', testInfo);
        const u = {
            manager: `${tag}mg`,
            author: `${tag}au`,
            reviewer: `${tag}rv`,
            reader: `${tag}rd`,
            copyeditor: `${tag}ce`,
            subscriptionManager: `${tag}sm`,
            ended: `${tag}ex`,
        };
        await ojsApi.createContext({
            tag,
            users: [
                person(u.manager, 'Mona', 'Manager', ['manager']),
                person(u.author, 'Ada', 'Author', ['author']),
                person(u.reviewer, 'Rex', 'Reviewer', ['externalReviewer']),
                person(u.reader, 'Rita', 'Reader', ['reader']),
                person(u.copyeditor, 'Cory', 'Copyeditor', ['copyeditor']),
                person(u.subscriptionManager, 'Sue', 'Subscriptions', ['subscriptionManager']),
                person(u.ended, 'Ed', 'Ended', [], {pastRoles: [{role: 'reader', dateStart: utcDay(7), dateEnd: utcDay(1)}]}),
            ],
        });

        // The addresses as the scratch journal's Journal Manager's side menu
        // holds them (footnote b); the control reads them below.
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

        // Author, Reviewer, Reader, Copyeditor and Subscription Manager: the
        // access-denied page at each address (Actors rows 1, 3).
        for (const username of [u.author, u.reviewer, u.reader, u.copyeditor, u.subscriptionManager]) {
            const page = await pageAs(asUser, username);
            for (const [name, address] of three) {
                await page.goto(address);
                await expectAccessDenied(page, `${username} on ${name}`);
            }
        }

        // The Reader whose role ended and the seeded journal's Journal
        // Manager, who holds no role here: the same page at "Editorial
        // Activity" and "Users" (Actors row 1).
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

        // Control: the Journal Manager opens each page. "Editorial Activity"
        // draws no ring, its total and every stage read 0; "Users" shows its
        // heading; "Reports" its heading (Fields; Rule 2).
        const editorial = new EditorialActivityPage(mgPage, tag);
        await editorial.goto(editorialAddress);
        await expect(mgPage).not.toHaveURL(/authorizationDenied/);
        await editorial.expectChart(0, STAGES.map((s) => [s, 0]));
        await editorial.expectRing(false);
        const users = new UserStatsPage(mgPage, tag);
        await users.goto(usersAddress);
        await expect(users.heading).toBeVisible();
        const reports = new EditorialReportsPage(mgPage, tag);
        await reports.goto(reportsAddress);
        await expect(reports.heading).toHaveText('Reports');
    });

    test('S2: counting and exporting the journal\'s users', async ({asUser, ojsApi}, testInfo) => {
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
        await ojsApi.createContext({
            tag,
            users: [
                person(u.manager, 'Mona', 'Manager', ['manager']),
                person(u.se, 'Sid', 'Editor', ['sectionEditor']),
                person(u.nova, 'Nova', 'Nilsen', ['author', 'reader']),
                person(u.otto, 'Otto', 'Olsen', ['author']),
                person(u.cora, 'Cora', 'Copper', ['copyeditor']),
                person(u.pia, 'Pia', 'Pardo', ['author'], {disabled: true}),
                person(u.quinn, 'Quinn', 'Quist', [], {pastRoles: [{role: 'reader', dateStart: utcDay(7), dateEnd: utcDay(1)}]}),
            ],
        });
        const expectedRows = [
            ['All Users', '6'],
            ['Journal Manager', '2'],
            ['Section Editor', '1'],
            ['Assistant', '1'],
            ['Author', '2'],
            ['Reviewer', '0'],
            ['Reader', '1'],
            ['Subscription Manager', '0'],
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
        expect(await win.boxSet()).toEqual(byLabel(ROLES.map((r) => [r, true])));
        await expect(win.exportButton).toBeVisible();
        const viewport = page.viewportSize();
        const at = await win.position();
        expect(Math.round(at.x + at.width), 'the window stands against the right edge').toBeGreaterThanOrEqual(viewport.width - 2);

        // Every role exported: the window closes, the file downloads with
        // its BOM, columns and one line per current account (Rule 17; Fields).
        const all = await win.export();
        expect(all.name).toBe(`user-report-${TODAY}.csv`);
        expect(all.bom, 'the file starts with a byte-order mark').toBe(true);
        expect(userExportHeader(all.rows[0])).toEqual(userExportHeader(USER_COLUMNS));
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
        expect(await win.boxSet()).toEqual(byLabel(ROLES.map((r) => [r, true])));
        await win.tickOnly(['Author']);
        const authors = await win.export();
        expect(userExportHeader(authors.rows[0])).toEqual(userExportHeader(USER_COLUMNS));
        expect(authors.rows.slice(1).map((r) => asRecord(authors.rows[0], r)['Email address']).sort()).toEqual([email(u.nova), email(u.otto)].sort());

        // No role exported: "Author" alone ticked, as last left; unticked,
        // the window still exports and the file holds the column names alone
        // (Rules 16, 17).
        win = await users.openExport();
        expect(await win.boxSet()).toEqual(byLabel(ROLES.map((r) => [r, r === 'Author'])));
        await win.tickOnly([]);
        const none = await win.export();
        expect(none.bom).toBe(true);
        expect(none.rows.map(userExportHeader)).toEqual([userExportHeader(USER_COLUMNS)]);

        // The Section Editor: the same rows with the same counts (Actors
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
        expect(await win.boxSet()).toEqual(byLabel(ROLES.map((r) => [r, true])));
        await win.close();
    });

    test('S3: the monthly statistics email', async ({asUser, ojsApi, pkpMail, browser, baseURL}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s3', testInfo);
        const u = {maya: `${tag}maya`, sol: `${tag}sol`, tess: `${tag}tess`, uma: `${tag}uma`, vic: `${tag}vic`, wes: `${tag}wes`};
        await ojsApi.createContext({
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
        await seed(ojsApi, tag, 'ax', 'Axolotl', u.wes, {dateSubmitted: previousMonth(10)});
        await seed(ojsApi, tag, 'bi', 'Bison', u.wes, {dateSubmitted: previousMonth(10)});
        await seed(ojsApi, tag, 'ca', 'Caribou', u.wes, {dateSubmitted: previousMonth(12), decisions: ['sendExternalReview', 'accept']});
        await seed(ojsApi, tag, 'eg', 'Egret', u.wes, {dateSubmitted: previousMonth(15), decisions: ['initialDecline']});
        await seed(ojsApi, tag, 'ke', 'Kea', u.wes);
        await ojsApi.runTask({task: 'statisticsReport', context: tag});

        // Maya's and Sol's email: subject, opening, figures, closing,
        // signature and footer (Rules 24, 25; Fields).
        const [maya] = await statisticsEmails(pkpMail, email(u.maya));
        const [sol] = await statisticsEmails(pkpMail, email(u.sol));
        for (const [who, name, m] of [['Maya', 'Maya Moss', maya], ['Sol', 'Sol Sato', sol]]) {
            expect(m.subject, `${who}'s subject`).toBe(`Editorial activity for ${PREVIOUS_MONTH}`);
            const text = m.text.replace(/\r\n/g, '\n');
            expect(text.trimStart(), `${who}'s email opens with the name`).toMatch(new RegExp(`^${name},\\s*\\n`));
            expect(text).toContain(`Your journal health report for ${PREVIOUS_MONTH} is now available. Your key stats for this month are below.`);
            expect(text).toMatch(/New submissions this month: 4\b/);
            expect(text).toMatch(/Declined submissions this month: 1\b/);
            expect(text).toMatch(/Accepted submissions this month: 1\b/);
            expect(text).toMatch(/Total submissions in the system: 5\b/);
            const flat = text.replace(/\s*\(\s*https?:\/\/[^)]*\)/g, '').replace(/\s+/g, ' ');
            expect(flat).toContain(
                "Login to the journal to view more detailed editorial trends and published article stats. A full copy of this month's editorial trends is attached."
            );
            expect(flat.indexOf('Sincerely,'), `${who}: "Sincerely," after the closing`).toBeGreaterThan(flat.indexOf('A full copy of'));
            expect(m.links.map((l) => l.text)).toContain('Unsubscribe');
            expect(flat.indexOf('Unsubscribe'), `${who}: the footer after "Sincerely,"`).toBeGreaterThan(flat.indexOf('Sincerely,'));
        }

        // The link: in Sol's email "editorial trends" opens "Editorial
        // Activity" (Fields).
        const solPage = await pageAs(asUser, u.sol);
        const trendsLink = sol.links.find((l) => l.text === 'editorial trends');
        expect(trendsLink, 'Sol\'s email links "editorial trends"').toBeTruthy();
        const solStats = new EditorialActivityPage(solPage, tag);
        await solStats.goto(trendsLink.href);
        await expect(solPage).toHaveURL(new RegExp(`/index\\.php/${tag}/stats/editorial`));
        await expect(solPage).toHaveTitle(/^Editorial Activity/);

        // The attachment: BOM, three blocks (Rule 26).
        expect(sol.attachments.map((a) => a.name)).toEqual(['editorial-report.csv']);
        const report = sol.attachments[0];
        expect(report.bom, 'the attachment starts with a byte-order mark').toBe(true);
        const blocks = csvBlocks(report.rows);
        expect(blocks.map((b) => b[0])).toEqual([['Active Submissions', 'Total'], ['Trends', PREVIOUS_MONTH, 'Total'], ['Users', 'Total']]);
        const trendsBlock = Object.fromEntries(blocks[1].slice(1).map((r) => [r[0], r.slice(1)]));
        expect(trendsBlock['Submissions Received']).toEqual(['4', '5']);
        expect(trendsBlock['Acceptance Rate']).toEqual(['0.5', '0.2']);
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
        await ojsApi.runTask({task: 'statisticsReport', context: tag});
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

    test('S4: a journal that sends no monthly email', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const u = {manager: `${tag}mg`, se: `${tag}se`, author: `${tag}au`};
        await ojsApi.createContext({
            tag,
            editorialStatsEmail: false,
            users: [
                person(u.manager, 'Mona', 'Manager', ['manager']),
                person(u.se, 'Sid', 'Editor', ['sectionEditor']),
                person(u.author, 'Ada', 'Author', ['author']),
            ],
        });
        await seed(ojsApi, tag, 'ax', 'Axolotl', u.author, {dateSubmitted: previousMonth(10)});

        // The Section Editor's Profile: "Editors" has no "Statistics report
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
        await ojsApi.runTask({task: 'statisticsReport', context: tag});
        let tasks = await openTasks(sePage, tag);
        await expect(tasks.panel.grid()).toBeVisible();
        await expect(tasks.panel.row(TASK_SENTENCE)).toHaveCount(0);
        await tasks.panel.close();

        // Switched back on, on screen, by the Journal Manager.
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
        await ojsApi.runTask({task: 'statisticsReport', context: tag});
        for (const username of [u.manager, u.se]) {
            const [m] = await statisticsEmails(pkpMail, email(username));
            expect(m.subject).toBe(`Editorial activity for ${PREVIOUS_MONTH}`);
            expect(m.text).toMatch(/New submissions this month: 1\b/);
            expect(await statisticsEmailCount(pkpMail, email(username)), `${username}: one email from the two runs`).toBe(1);
        }
        tasks = await openTasks(sePage, tag);
        await expect(tasks.panel.row(TASK_SENTENCE)).toHaveCount(1);

        // Control: the Author gets no email from either run, bounded by the
        // Journal Manager's (Actors row 4).
        expect(await statisticsEmailCount(pkpMail, email(u.author)), 'the Author gets no email').toBe(0);
    });

    test('S5: yearly averages in "Total"', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const u = {manager: `${tag}mg`, author: `${tag}au`};
        await ojsApi.createContext({
            tag,
            users: [person(u.manager, 'Mona', 'Manager', ['manager']), person(u.author, 'Ada', 'Author', ['author'])],
        });
        await seed(ojsApi, tag, 'al', 'Alpha', u.author, {dateSubmitted: `${YEAR - 3}-03-01`});
        await seed(ojsApi, tag, 'be', 'Beta', u.author, {dateSubmitted: `${YEAR - 2}-03-01`});
        await seed(ojsApi, tag, 'ga', 'Gamma', u.author, {dateSubmitted: `${YEAR - 2}-03-01`, decisions: ['sendExternalReview', 'decline']});
        await seed(ojsApi, tag, 'de', 'Delta', u.author, {dateSubmitted: `${LAST_YEAR}-03-01`});
        await seed(ojsApi, tag, 'ep', 'Epsilon', u.author, {dateSubmitted: `${LAST_YEAR}-03-01`});
        await seed(ojsApi, tag, 'ze', 'Zeta', u.author);

        // "Total": the averages and their absence (Rules 8, 8a).
        const page = await pageAs(asUser, u.manager);
        const stats = new EditorialActivityPage(page, tag);
        await stats.goto();
        const totals = {
            'Submissions Received': '6 (2/year)',
            'Submissions Declined': '1',
            'Submissions Declined (After Review)': '1',
            'Submissions Accepted': '0',
            'Submissions Declined (Desk Reject)': '0',
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

    test('S6: reading "Editorial Activity"', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s6', testInfo);
        const u = {manager: `${tag}mg`, se: `${tag}se`, author: `${tag}au`};
        await ojsApi.createContext({
            tag,
            sections: [
                {abbrev: 'ART', title: 'Articles'},
                {abbrev: 'REV', title: 'Reviews'},
            ],
            users: [
                person(u.manager, 'Mona', 'Manager', ['manager']),
                person(u.se, 'Sid', 'Editor', ['sectionEditor']),
                person(u.author, 'Ada', 'Author', ['author']),
            ],
        });
        const LY = LAST_YEAR;
        for (const k of ['q1', 'q2', 'q3', 'q4']) await seed(ojsApi, tag, k, `Quail ${k}`, u.author, {section: 'ART', dateSubmitted: `${LY}-03-15`});
        await seed(ojsApi, tag, 'bi', 'Bison', u.author, {section: 'ART', dateSubmitted: `${LY}-04-20`, decisions: ['sendExternalReview']});
        await seed(ojsApi, tag, 'ca', 'Caribou', u.author, {section: 'ART', dateSubmitted: `${LY}-05-10`, decisions: ['sendExternalReview', 'accept']});
        await seed(ojsApi, tag, 'di', 'Dingo', u.author, {section: 'ART', dateSubmitted: `${LY}-06-05`, decisions: ['sendExternalReview', 'accept', 'sendToProduction']});
        const egret = await seed(ojsApi, tag, 'eg', 'Egret', u.author, {section: 'REV', dateSubmitted: `${LY}-07-12`, decisions: ['initialDecline']});
        await seed(ojsApi, tag, 'fe', 'Ferret', u.author, {section: 'ART', dateSubmitted: `${LY}-08-08`, decisions: ['sendExternalReview', 'decline']});
        await seed(ojsApi, tag, 'ge', 'Gecko', u.author, {
            section: 'REV',
            dateSubmitted: `${LY}-09-03`,
            decisions: ['sendExternalReview', 'accept', 'sendToProduction'],
            published: true,
        });
        await seed(ojsApi, tag, 'he', 'Heron', u.author, {section: 'ART', dateSubmitted: `${LY}-09-20`, published: true, datePublished: `${LY}-02-01`});
        await seed(ojsApi, tag, 'ib', 'Ibis', u.author, {section: 'ART', submitted: false});
        const chart7 = [['Submission', 4], ['Review', 1], ['Copyediting', 1], ['Production', 1]];

        // On arrival: the chart, the columns, the sixteen rows, "Total" and a
        // middle column of zeros (Rules 1–3, 6, 6a, 7b, 8a, 9, 10).
        const page = await pageAs(asUser, u.manager);
        const stats = new EditorialActivityPage(page, tag);
        await stats.goto();
        await expect(page).toHaveTitle(/^Editorial Activity/);
        await stats.expectChart(7, chart7);
        await stats.expectRing(true);
        await expect(stats.trendsHeading).toContainText('Trends');
        await expect(stats.trendsColumns()).toHaveText(['Name', RANGE(utcDay(91), utcDay(1)), 'Total']);
        await stats.expectRowNames(TRENDS);
        const arrivalTotals = {
            'Submissions Received': '10',
            'Submissions Accepted': '3',
            'Submissions Declined': '2',
            'Submissions Declined (Desk Reject)': '1',
            'Submissions Declined (After Review)': '1',
            'Submissions Published': '1',
            'Other Submissions': '2',
            'Submissions In Progress': '1',
            'Imported Submissions': '1',
            'Days to First Editorial Decision': '0',
            'Days to Accept': '0',
            'Days to Reject': '0',
            'Acceptance Rate': '30%',
            'Rejection Rate': '20%',
            'Desk Reject Rate': '10%',
            'After Review Reject Rate': '10%',
        };
        await stats.expectColumn('total', arrivalTotals);
        await expect.poll(() => stats.columnValues('middle'), {timeout: T}).toEqual(TRENDS.map((r) => (/Rate$/.test(r) ? '0%' : '0')));
        const arrivalRead = await stats.readTrends();

        // The presets: four and "Custom Range", no "All dates" (Rule 3).
        expect(await stats.presetLabels()).toEqual(PRESETS);
        await stats.openRangeList();
        await expect(stats.customRangeLegend()).toHaveText('Custom Range');
        await expect(stats.presets.filter({hasText: 'All dates'})).toHaveCount(0);
        await stats.calendarButton.click();
        await expect(stats.rangeList).toBeHidden();

        // "Last year": the range's figures; "Total" and the chart kept
        // (Rules 2, 3, 7, 7b, 9).
        await stats.choosePreset('Last year');
        await expect(stats.trendsColumns()).toHaveText(['Name', RANGE(`${LY}-01-01`, `${LY}-12-31`), 'Total']);
        await stats.expectColumn('middle', {
            'Submissions Received': 10,
            'Submissions Accepted': 3,
            'Submissions Declined': 2,
            'Submissions Declined (Desk Reject)': 1,
            'Submissions Declined (After Review)': 1,
            'Submissions Published': 1,
            'Other Submissions': 1,
            'Submissions In Progress': 0,
            'Imported Submissions': 1,
            'Acceptance Rate': '60%',
            'Rejection Rate': '40%',
            'Desk Reject Rate': '20%',
            'After Review Reject Rate': '20%',
        });
        await stats.expectColumn('total', arrivalTotals);
        await stats.expectChart(7, chart7);

        // A Custom Range, 1 June to 30 September of last year (Rules 2, 3, 7, 9).
        await stats.applyCustomRange(`${LY}-06-01`, `${LY}-09-30`);
        await expect(stats.trendsColumns()).toHaveText(['Name', RANGE(`${LY}-06-01`, `${LY}-09-30`), 'Total']);
        const customFigures = {
            'Submissions Received': 4,
            'Submissions Accepted': 2,
            'Submissions Declined': 2,
            'Submissions Declined (Desk Reject)': 1,
            'Submissions Declined (After Review)': 1,
            'Submissions Published': 1,
            'Other Submissions': 1,
            'Imported Submissions': 1,
            'Acceptance Rate': '50%',
            'Rejection Rate': '50%',
            'Desk Reject Rate': '25%',
            'After Review Reject Rate': '25%',
        };
        await stats.expectColumn('middle', customFigures);
        await stats.expectChart(7, chart7);

        // "Filters": "Articles" and "Reviews" under "Sections"; "Reviews"
        // narrows both columns, not the chart; "Filters" again closes the
        // panel and the Custom Range figures return (Rules 4, 4a–4c).
        await stats.toggleFilters();
        await stats.expectFiltersOpen(true);
        await expect(stats.filterHeadings()).toHaveText(['Sections']);
        await expect(stats.filterNames('Sections')).toHaveText(['Articles', 'Reviews']);
        const listed = stats.listFetched();
        await stats.filterName('Sections', 'Reviews').click();
        await listed;
        const reviews = {'Submissions Received': 2, 'Submissions Accepted': 1, 'Submissions Declined': 1, 'Submissions Published': 1};
        await stats.expectColumn('middle', reviews);
        await stats.expectColumn('total', reviews);
        await stats.expectChart(7, chart7);
        await stats.closeFilters();
        await stats.expectColumn('middle', customFigures);
        await stats.expectColumn('total', arrivalTotals);

        // Sub-rows: each starts further right than every other row (Rule 12).
        const starts = await stats.nameStarts();
        const subStarts = SUB_ROWS.map((r) => starts[r]);
        const otherStarts = TRENDS.filter((r) => !SUB_ROWS.includes(r)).map((r) => starts[r]);
        expect(subStarts.every((x) => typeof x === 'number') && otherStarts.every((x) => typeof x === 'number'), 'every row\'s name was measured').toBe(true);
        expect(Math.min(...subStarts), 'the sub-rows stand indented').toBeGreaterThan(Math.max(...otherStarts));

        // Information icons, with the pointer resting on them (Rule 11; A5).
        expect(await stats.iconText('Other Submissions')).toBe(ICON_OTHER);
        expect(await stats.iconText('Acceptance Rate')).toMatch(new RegExp(`^${ICON_RATE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
        expect(await stats.iconText('Days to First Editorial Decision')).toMatch(new RegExp(`^${ICON_DAYS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

        // The Section Editor, assigned to nothing: the same chart and "Total"
        // (Actors paragraph).
        const sePage = await pageAs(asUser, u.se);
        const seStats = new EditorialActivityPage(sePage, tag);
        await seStats.goto();
        await seStats.expectChart(7, chart7);
        await seStats.expectColumn('total', arrivalTotals);
        expect((await seStats.readTrends()).map((r) => [r[0], r[2]])).toEqual(arrivalRead.map((r) => [r[0], r[2]]));

        // "Revert Decline" on "Egret", its email skipped: one decline fewer,
        // no desk reject, eight active (Rules 2, 6b).
        const workflow = new WorkflowPage(page, tag);
        await workflow.gotoEditorial(egret.submissionId);
        await workflow.actionButton('Revert Decline').click();
        const wizard = new DecisionWizardPage(page);
        await wizard.expectTitle('Revert Decline');
        await wizard.skipEmail();
        await wizard.recordDecision('Submission Reactivated');
        await stats.goto();
        await stats.expectColumn('total', {'Submissions Declined': 1, 'Submissions Declined (Desk Reject)': 0});
        await stats.expectChart(8, [['Submission', 5], ['Review', 1], ['Copyediting', 1], ['Production', 1]]);

        // Control: "Submissions Received" still 10 (Rule 6).
        await stats.expectColumn('total', {'Submissions Received': 10});
    });

    test('S7: downloading the reports', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const u = {manager: `${tag}mg`, author: `${tag}au`, rhea: `${tag}rhea`, saul: `${tag}saul`};
        await ojsApi.createContext({
            tag,
            context: {acronym: 'J-PK'},
            users: [
                person(u.manager, 'Mona', 'Manager', ['manager']),
                person(u.author, 'Ada', 'Author', ['author']),
                person(u.rhea, 'Rhea', 'Reyes', ['externalReviewer']),
                person(u.saul, 'Saul', 'Soto', ['externalReviewer']),
            ],
        });
        const delta = await seed(ojsApi, tag, 'de', 'Delta notes', u.author, {
            decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: u.rhea, status: 'invited'}]}],
        });
        const marsh = await seed(ojsApi, tag, 'ma', 'Marsh survey', u.author, {
            contributors: [{givenName: 'Greta', familyName: 'Braun', email: `${tag}greta@mail.test`, country: 'DE'}],
            participants: [{username: 'admin', role: 'manager'}],
            decisions: ['sendExternalReview', 'accept'],
            reviewRounds: [
                {
                    reviewers: [
                        {username: u.rhea, status: 'completed', comments: 'Clear and well argued.'},
                        {username: u.saul, status: 'declined'},
                    ],
                },
            ],
        });
        const kelp = await seed(ojsApi, tag, 'ke', 'Kelp draft', u.author, {submitted: false});
        const title = (name) => `${name} ${tag}`;

        // "Reports": heading, line, the four links, read as a set: their
        // order follows the install's plugin list (Rule 18; Fields; T-ojs-2).
        const page = await pageAs(asUser, u.manager);
        const chrome = await editorialChrome(page, tag);
        await chrome.chooseSideEntry('Statistics', 'Reports');
        const reports = new EditorialReportsPage(page, tag);
        await reports.arrived();
        await expect(reports.heading).toHaveText('Reports');
        await expect(reports.line).toHaveText(REPORTS_LINE);
        await reports.expectLinkSet(REPORT_LINKS);

        // "Articles Report": the file at once, the page as it was; BOM,
        // columns to "(Author 2)", one line per submission, the draft among
        // them (Rules 19, 20, 23; Fields).
        const articles = await reports.download('Articles Report');
        expect(articles.name).toBe(`articles-JPK-${COMPACT_TODAY}.csv`);
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tag}/stats/reports$`));
        await expect(reports.heading).toHaveText('Reports');
        await reports.expectLinkSet(REPORT_LINKS);
        expect(articles.bom).toBe(true);
        expect(emailHeadings(articles.rows[0])).toEqual([
            'Submission ID',
            'Title',
            'Abstract',
            ...AUTHOR_COLUMNS(1),
            ...AUTHOR_COLUMNS(2),
            ...ARTICLE_MIDDLE,
            ...EDITOR_COLUMNS(1),
            ...DECISION_COLUMNS(1, 1),
            ...DECISION_COLUMNS(1, 2),
        ]);
        const articleLines = articles.rows.slice(1).map((r) => asRecord(articles.rows[0], r));
        expect(articleLines.map((l) => l['Title']).sort()).toEqual([title('Delta notes'), title('Marsh survey'), title('Kelp draft')].sort());
        expect(articleLines.map((l) => l['Submission ID']).sort()).toEqual([delta.submissionId, marsh.submissionId, kelp.submissionId].map(String).sort());

        // "Marsh survey"'s line: Greta as Author 2, "Copyediting", the Site
        // Administrator as Editor 1 with two dated decisions; its "URL" opens
        // it (Rules 20a–20c).
        const marshLine = articleLines.find((l) => l['Title'] === title('Marsh survey'));
        expect([marshLine['Given Name (Author 2)'], marshLine['Family Name (Author 2)'], marshLine['Country (Author 2)']]).toEqual(['Greta', 'Braun', 'DE']);
        expect(marshLine['Status']).toBe('Copyediting');
        expect([marshLine['Given Name (Editor 1)'], marshLine['Family Name (Editor 1)']]).toEqual(['admin', 'admin']);
        for (const d of [1, 2]) {
            expect(marshLine[`Editor Decision ${d}  (Editor 1)`], `decision ${d} named`).not.toBe('');
            expect(marshLine[`Date decided ${d}  (Editor 1)`], `decision ${d} dated`).toMatch(/^\d{4}-\d{2}-\d{2}/);
        }
        expect(marshLine[`Date decided 1  (Editor 1)`] <= marshLine[`Date decided 2  (Editor 1)`], 'oldest first').toBe(true);

        // "Delta notes"'s line: "Review", no second author (Rules 20a, 20c).
        const deltaLine = articleLines.find((l) => l['Title'] === title('Delta notes'));
        expect(deltaLine['Status']).toBe('Review');
        expect(AUTHOR_COLUMNS(2).map((c) => deltaLine[c])).toEqual(AUTHOR_COLUMNS(2).map(() => ''));

        // "Review Report": the file at once; BOM, columns, three lines, "Delta
        // notes"'s first (Rules 21, 21a, 21b, 21d).
        const reviews = await reports.download('Review Report');
        expect(reviews.name).toBe(`reviews-${COMPACT_TODAY}.csv`);
        await expect(reports.heading).toHaveText('Reports');
        expect(reviews.bom).toBe(true);
        expect(emailHeadings(reviews.rows[0])).toEqual(REVIEW_COLUMNS);
        const reviewLines = reviews.rows.slice(1).map((r) => asRecord(reviews.rows[0], r));
        expect(reviewLines.map((l) => l['Submission Title'])).toEqual([title('Delta notes'), title('Marsh survey'), title('Marsh survey')]);
        for (const l of reviewLines) expect(l['Stage']).toBe('Review');
        const rheaMarsh = reviewLines.find((l) => l['Submission Title'] === title('Marsh survey') && l['Reviewer'] === u.rhea);
        expect(rheaMarsh, 'Rhea\'s line for "Marsh survey"').toBeTruthy();
        expect([rheaMarsh['Declined'], rheaMarsh['Cancelled'], rheaMarsh['Consideration'], rheaMarsh['Comments On Submission']]).toEqual([
            'No',
            'No',
            'Never',
            '<p>Clear and well argued.</p>',
        ]);
        const saulMarsh = reviewLines.find((l) => l['Submission Title'] === title('Marsh survey') && l['Reviewer'] === u.saul);
        expect(saulMarsh, 'Saul\'s line').toBeTruthy();
        expect(saulMarsh['Declined']).toBe('Yes');
        const rheaDelta = reviewLines.find((l) => l['Submission Title'] === title('Delta notes'));
        expect(rheaDelta['Reviewer']).toBe(u.rhea);
        expect(rheaDelta['Declined']).toBe('No');

        // Control: "Kelp draft" has no line in "Review Report", beside the
        // three others read above (Rule 21).
        expect(reviewLines.filter((l) => l['Submission Title'] === title('Kelp draft'))).toEqual([]);

        // The Plugins tab: every report's box ticked and locked; the review
        // report's "Reports" link downloads the same file (Actors row 3; Rule 18).
        const plugins = new WebsitePluginsPage(page, tag);
        await plugins.goto();
        const reportRows = (await plugins.list.read()).find((c) => c.heading === 'Report Plugins');
        expect(reportRows, 'the "Report Plugins" group').toBeTruthy();
        expect(reportRows.rows.length).toBeGreaterThan(0);
        for (const r of reportRows.rows) expect([r.name, r.ticked, r.locked]).toEqual([r.name, true, true]);
        const reviewPlugin = reportRows.rows.find((r) => r.name === 'Review Report');
        expect(reviewPlugin, 'the review report\'s row').toBeTruthy();
        await plugins.list.openArrow(reviewPlugin.id);
        const again = await downloadFromLink(page, plugins.list.rowLink(reviewPlugin.id, 'Reports'));
        expect(again.name).toBe(`reviews-${COMPACT_TODAY}.csv`);
        expect(again.rows).toEqual(reviews.rows);

        // "Marsh survey"'s "URL" opens it (Rule 20c).
        await page.goto(marshLine['URL']);
        const workflow = new WorkflowPage(page, tag);
        await workflow.expectOpen(marsh.submissionId);
        await expect(workflow.header()).toContainText(title('Marsh survey'));
    });

    test('S8: "Subscriptions Report"', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s8', testInfo);
        const u = {manager: `${tag}mg`, nell: `${tag}nell`, pat: `${tag}pat`};
        const institution = `Okapi Institute ${tag}`;
        await ojsApi.createContext({
            tag,
            users: [
                person(u.manager, 'Mona', 'Manager', ['manager']),
                person(u.nell, 'Nell', 'Noor', ['reader']),
                person(u.pat, 'Pat', 'Park', ['reader']),
            ],
            subscriptionTypes: [
                {name: 'Reader Year', cost: 40, currency: 'USD', duration: 12},
                {name: 'Campus Year', cost: 400, currency: 'USD', duration: 12, institutional: true},
            ],
            institutions: [{name: institution, ipRanges: ['10.0.0.0/8']}],
            subscriptions: [
                {user: u.nell, type: 'Reader Year'},
                {user: u.pat, type: 'Campus Year', institution},
            ],
        });

        // Pat's country, "Canada", saved on Pat's own Profile › "Contact"
        // (footnote sc: no key sets an account's country).
        const patPage = await pageAs(asUser, u.pat);
        const patProfile = new ProfilePage(patPage, tag);
        await patProfile.goto('contact');
        await patProfile.country().selectOption('CA');
        await patProfile.save();
        await patProfile.goto('contact');
        await expect(patProfile.country()).toHaveValue('CA');

        // The file: BOM, the individual block with Nell's line, an empty
        // line, the institutional block with the institute's line (Rule 22;
        // Fields).
        const page = await pageAs(asUser, u.manager);
        const reports = new EditorialReportsPage(page, tag);
        await reports.goto();
        const file = await reports.download('Subscriptions Report');
        expect(file.name).toBe(`subscriptions-${COMPACT_TODAY}.csv`);
        expect(file.bom).toBe(true);
        const blocks = csvBlocks(file.rows);
        expect(blocks.length).toBe(2);
        const [individual, institutional] = blocks;
        expect(individual[0]).toEqual(['Individual Subscriptions']);
        expect(emailHeadings(individual[1])).toEqual(SUBS_INDIVIDUAL);
        expect(individual.length, 'one individual line').toBe(3);
        const nell = asRecord(SUBS_INDIVIDUAL, individual[2]);
        expect(nell['Email address']).toBe(email(u.nell));
        expect(nell['Country']).toBe('');
        expect(institutional[0]).toEqual(['Institutional Subscriptions']);
        expect(emailHeadings(institutional[1])).toEqual(SUBS_INSTITUTIONAL);
        expect(institutional.length, 'one institutional line').toBe(3);
        const okapi = asRecord(SUBS_INSTITUTIONAL, institutional[2]);
        expect(okapi['Institution Name']).toBe(institution);
        expect(okapi['Country']).toBe('Canada');
        // The empty line between the blocks.
        const gap = file.rows.findIndex((r) => r.length === 0);
        expect(file.rows[gap + 1]).toEqual(['Institutional Subscriptions']);

        // Control: the page stays as it was (Rule 19).
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tag}/stats/reports$`));
        await expect(reports.heading).toHaveText('Reports');
        await reports.expectLinkSet(REPORT_LINKS);
    });
});
