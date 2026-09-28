// @ts-check
/**
 * @file playwright/tests/U65-editorial-statistics.spec.js
 *
 * Statistics — editorial activity & reports — OMP suite, one test per
 * canonical scenario the spec runs on a press, all in the parallel `omp`
 * project: S1–S5 (common) and S6–S7 ({OJS OMP}), in the press's own words
 * (the Press Manager, the Series Editor, the five stages with "Internal
 * Review" and "External Review", "Monograph Report", "your press health
 * report", "published book stats"). S8 is the journal's ("Subscriptions
 * Report") and S9 the preprint server's; this suite asserts no absence
 * beyond what S1–S7 state. The {OJS} legs inside the common scenarios (the
 * Subscription Manager, the sections filter, the "Articles Report" country
 * code and "URL") have no press leg here.
 * Spec: docs/specs/U65-editorial-statistics.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A6 🐞: S2 reads the "Site Administrator" row's name and place, never
 *   its figure.
 * - A9 🐞: S3 reads the attachment's "Active Submissions" block by its
 *   heading line only.
 * - A11 🐞: S3 reads the email's closing from "to view more detailed…" on,
 *   never the words before it.
 * - A14 🐞: S4 leaves the Section Editor's Profile tab without saving.
 * - A5 🐞: S6 rests the pointer on the icons; no keyboard read.
 * - A3 ❓: S6 reads the draft started today only.
 * - OMP2 🐞: S6 reads the "Days to First Editorial Decision" text's
 *   opening sentence, never its "your journal" ending.
 * - OMP3 🐞: S7 reads "Monograph Report"'s author columns to "(Author 2)"
 *   and no further.
 * - A1, A2, A4, A7, A8, A10, A12, A13, OMP1, OMP4, OMP5: not on these
 *   scenarios' paths. OJS1–OJS4 and OPS1–OPS4: the journal's and the
 *   preprint server's.
 *
 * Seeding (footnote sc): every scenario builds its own scratch press with
 * `POST scenarios/context` and throwaway `users[]` (the Site Administrator
 * is enrolled as a Press Manager in every one, and counted), and its books
 * with `POST scenarios/submission`, a throwaway author as submitter:
 * "received on" a day is `dateSubmitted`, "sent to review"
 * `sendExternalReview`, "accepted" `accept`, "sent to production"
 * `sendToProduction`, "declined at the Submission stage" `initialDecline`,
 * "declined there" (after review) `decline`, "published" `published: true`,
 * an imported book a `datePublished` before its `dateSubmitted`, a draft
 * `submitted: false`. The monthly email is `POST scenarios/task`
 * `{task: 'statisticsReport', context}`, scoped to its press and safe in a
 * parallel test; every mail read is scoped by a throwaway's address (the
 * site administrator gets one per run of every test), and every "no email"
 * is read after a message that did arrive bounds the wait (A8). The
 * seeded press is never read: its figures move with every other suite.
 * S2 and S7 read the files the browser downloads; S3 reads the email's
 * attachment from the mail catcher. S4's switch back on and S6's "Revert
 * Decline" are recorded on screen, as footnote sc says. Tags are unique per
 * run (M5); waits are web-first or bounded by the screen's own answer (A5).
 *
 * Every scenario runs through `crashReplay()`: when the worker server's
 * `php -S` dies under one of the attempt's requests (PHP 8.3's exit-139
 * segfault, app-changes row 18; seen here on the "Editorial Activity"
 * figures' GETs and on `scenarios/task`), the attempt is discarded and the
 * scenario runs again from its seeding on a fresh press, each drop kept as
 * an `app-crash` annotation. No assertion is relaxed.
 */
const {test, expect} = require('../support/fixtures.js');
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
const {utcDay, monthStart} = require('../../../../shared/playwright/pages/UsageStatsPages.js');
const {EditorialChrome} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {TasksPanel, UnsubscribePage} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {ProfilePage} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {WorkflowEmailsSettingsPage} = require('../../../../shared/playwright/pages/EmailsPages.js');
const {WebsitePluginsPage} = require('../../../../shared/playwright/pages/PluginsPages.js');
const {openEditorial, decisionButton} = require('../pages/ReviewStagePages.js');
const {DecisionWizardPage} = require('../pages/DecisionWizardPages.js');

const T = 30_000;

// ---- the press's words (Fields) --------------------------------------------------------

/** The chart's stages on a press, in order. */
const STAGES = ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'];
const zeroStages = () => STAGES.map((s) => [s, 0]);

/** The "Trends" rows of a journal and a press, in order (Fields). */
const TRENDS_ROWS = [
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
/** The sub-rows (Rule 12). */
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

/** The information icons' texts (Fields). */
const OTHER_TEXT =
    'This includes submissions that are not counted in other totals, such as those that are still in progress and those that appear to have been imported.';
const RATE_TEXT =
    'The percentage for the selected date range is calculated for submissions that were submitted during this date range and have received a final decision. For example, consider the case where ten submissions were made during this date range. Four were accepted, four were rejected and two are still awaiting a final decision. The acceptance rate will be 50% (4 of 8 submissions) because the two submissions that have not reached a final decision are not counted.';
const DAYS_TEXT_OPENING =
    'The number of days it takes for most submissions to receive the first editorial decision, such as desk rejection or send for review.';

/** The "Users" rows on a press, in order (Fields). */
const USERS_ROWS = ['All Users', 'Site Administrator', 'Press Manager', 'Series Editor', 'Assistant', 'Author', 'Reviewer', 'Reader'];

/** The press's roles, as the export window's boxes and the file's role columns name them. */
const PRESS_ROLES = [
    'Press manager',
    'Press editor',
    'Production editor',
    'Series editor',
    'Copyeditor',
    'Designer',
    'Funding coordinator',
    'Indexer',
    'Layout Editor',
    'Marketing and sales coordinator',
    'Proofreader',
    'Author',
    'Volume editor',
    'Chapter Author',
    'Translator',
    'Internal Reviewer',
    'External Reviewer',
    'Reader',
    'Editorial Board Member',
];
/** The exported file's fixed columns (Fields). */
const USER_COLUMNS = ['ID', 'Given Name', 'Family Name', 'Email address', 'Phone', 'Country', 'Mailing Address', 'Date registered', 'Updated'];

/** "Reports" (Fields). */
const REPORTS_LINE =
    'The system generates reports that track the details associated with site usage and submissions over a given period of time. Reports are generated in CSV format which requires a spreadsheet application to view.';
const REPORT_LINKS = ['Monograph Report', 'Review Report'];
const MONOGRAPH_COLUMNS = [
    'ID',
    'Title',
    'Abstract',
    'Series',
    'Series Position',
    'Language',
    'Coverage Information',
    'Rights',
    'Source',
    'Subjects',
    'Type',
    'Disciplines',
    'Keywords',
    'Supporting Agencies',
    'Status',
    'URL',
    'Online ISSN',
    'Print ISSN',
    'DOI',
    'Categories',
    'Identifiers',
    'Date submitted',
    'Last modified',
    'First published',
];
const authorColumns = (n) => [
    `Given Name (Author ${n})`,
    `Family Name (Author ${n})`,
    `ORCID iD (Author ${n})`,
    `Country (Author ${n})`,
    `Affiliation (Author ${n})`,
    `Email address (Author ${n})`,
    `Homepage URL (Author ${n})`,
    `Bio Statement (e.g., department and rank) (Author ${n})`,
];
const REVIEW_COLUMNS = [
    'Stage',
    'Round',
    'Submission Title',
    'Submission ID',
    'Reviewer',
    'Given Name',
    'Family Name',
    'ORCID iD',
    'Country',
    'Affiliation',
    'Email address',
    'Reviewing interests',
    'Date Assigned',
    'Date Notified',
    'Date Confirmed',
    'Date Completed',
    'Date Acknowledged',
    'Consideration',
    'Date Reminded',
    'Response Due Date',
    'Response Overdue Days',
    'Review Due Date',
    'Review Overdue Days',
    'Declined',
    'Cancelled',
    'Recommendation',
    'Comments On Submission',
];

/** The monthly email on a press (Fields). */
const HEALTH_LINE = (month) => `Your press health report for ${month} is now available. Your key stats for this month are below.`;
const CLOSING_TAIL = "to view more detailed editorial trends and published book stats. A full copy of this month's editorial trends is attached.";
const KIND_REMINDER = "This is a kind reminder for you to check your publication's health through the editorial report.";
const STATS_SUMMARY = 'Statistics report summary.';

// ---- dates -------------------------------------------------------------------------------

const TODAY = utcDay(0);
const YEAR = Number(TODAY.slice(0, 4));
const FILE_DAY = TODAY.replace(/-/g, '');
/** A day of the previous month, `YYYY-MM-DD`. */
const prevMonthDay = (day) => `${monthStart(-1).slice(0, 8)}${String(day).padStart(2, '0')}`;
/** "{month}, {year}" of the previous month, as the email writes it ("August, 2026"). */
const PREV_MONTH = (() => {
    const first = monthStart(-1);
    const name = new Date(`${first}T00:00:00Z`).toLocaleDateString('en-US', {month: 'long', timeZone: 'UTC'});
    return `${name}, ${first.slice(0, 4)}`;
})();
/** The page's opening range, "Last 90 days". */
const RANGE_90 = () => `${utcDay(91)} — ${utcDay(1)}`;

// ---- seeding -----------------------------------------------------------------------------

/** Unique per-run tag: one alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u65${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles, extra = {}) {
    return {username, givenName, familyName, email: mailOf(username), roles, ...extra};
}

const mailOf = (username) => `${username}@mail.test`;

/** A role that ended yesterday (`pastRoles`), the account holding no other role. */
const endedReader = () => ({roles: [], pastRoles: [{role: 'reader', dateStart: utcDay(1), dateEnd: utcDay(1)}]});

/** A book of the scratch press. */
function seedBook(ompApi, tag, key, title, submitter, extra = {}) {
    return ompApi.createSubmission({tag: `${tag}${key}`, context: tag, submitter, title, ...extra});
}

/** A dropped answer: the worker server's `php -S` died under the request (exit 139). */
const DROPPED = /socket hang up|ECONNRESET|ECONNREFUSED|ERR_EMPTY_RESPONSE|ERR_CONNECTION_(RESET|REFUSED|CLOSED)|server dropped/;

/**
 * Run a scenario, and run it again from its seeding, on a fresh scratch
 * press, when the worker server died under one of its requests. Why (OMP
 * only): on PHP 8.3 a `php -S` process of the press segfaults (exit 139)
 * on the first request of a kind once earlier requests loaded classes in
 * an unlucky order (OPcache's inheritance cache, php-src GH-20469,
 * app-changes row 18); the harness respawns it within a second, and the
 * respawned process answers. Seen here on the "Editorial Activity"
 * figures' GETs and on `scenarios/task`, whose half-run state cannot be
 * resumed, so the attempt is discarded whole. An attempt fails over only
 * when the server dropped an answer during it (the error names the drop,
 * or a page of the attempt saw one); any other red is the test's. Every
 * attempt asserts everything; each drop is kept as an `app-crash`
 * annotation and a log line.
 */
function crashReplay(testInfo, baseURL) {
    const drops = [];
    const watch = (context) => {
        context.on('requestfailed', (request) => {
            const error = (request.failure() || {}).errorText || '';
            if (/ERR_EMPTY_RESPONSE|ERR_CONNECTION_(RESET|REFUSED|CLOSED)/.test(error) && request.url().startsWith(baseURL)) {
                drops.push(`${request.method()} ${request.url().replace(baseURL, '')}: ${error}`);
            }
        });
        return context;
    };
    return {
        /** A browser context of the attempt, watched for dropped answers. */
        watch,
        /** A page of `username`'s own browser, watched. */
        async page(asUser, username) {
            return watch(await asUser(username)).newPage();
        },
        async run(body, {attempts = 3} = {}) {
            for (let n = 1; ; n++) {
                const before = drops.length;
                try {
                    return await body(n);
                } catch (error) {
                    const message = String((error && error.message) || error).split('\n')[0];
                    const seen = drops.slice(before);
                    if (DROPPED.test(message)) seen.push(message);
                    if (!seen.length || n >= attempts) throw error;
                    testInfo.annotations.push({type: 'app-crash', description: `attempt ${n}: ${seen.join('; ')}`});
                    console.log(`[U65 ${testInfo.title.split(':')[0]}] the server dropped an answer (GH-20469, app-changes row 18): ${seen[0]}; the scenario runs again on a fresh press`);
                    await expect
                        .poll(() => fetch(`${baseURL}/README.md`).then((r) => r.status, () => 0), {timeout: T, intervals: [500, 1_000]})
                        .toBe(200);
                }
            }
        },
    };
}

// ---- reading ------------------------------------------------------------------------------

/** Open a "Statistics" entry from the side menu of an editorial page of `contextPath`. */
async function openFromSideMenu(page, contextPath, entry) {
    await page.goto(`/index.php/${contextPath}/submissions`);
    const chrome = new EditorialChrome(page);
    await chrome.waitSideMenu();
    await chrome.chooseSideEntry('Statistics', entry);
}

/** The Tasks panel of `page`, opened on an editorial page of `contextPath` (the bell read first). */
async function openTasks(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/submissions`);
    const tasks = new TasksPanel(page);
    await expect(tasks.bell()).toBeVisible({timeout: T});
    const count = await tasks.count();
    await tasks.open();
    return {tasks, count};
}

/** An email's HTML as the reader sees its words: tags dropped, entities read, spaces collapsed. */
function htmlWords(html) {
    return html
        .replace(/<(br|p|\/p|li|\/li|ul|\/ul)\b[^>]*>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

/** A spreadsheet's data lines as records, by its first line. */
function records(rows) {
    return rows.slice(1).map((r) => asRecord(rows[0], r));
}

test.describe('Statistics — editorial activity & reports', () => {
    test('S1: roles kept off the editorial statistics pages', async ({asUser, ompApi, browser, baseURL}, testInfo) => {
        test.setTimeout(480_000);
        const crash = crashReplay(testInfo, baseURL);
        await crash.run(async () => {
            const tag = makeTag('s1', testInfo);
            const u = {
                manager: `${tag}mg`,
                author: `${tag}au`,
                reviewer: `${tag}rv`,
                reader: `${tag}rd`,
                copyeditor: `${tag}ce`,
                ended: `${tag}ex`,
            };
            await ompApi.createContext({
                tag,
                users: [
                    user(u.manager, 'Mona', 'Manager', ['manager']),
                    user(u.author, 'Ada', 'Author', ['author']),
                    user(u.reviewer, 'Rex', 'Reviewer', ['externalReviewer']),
                    user(u.reader, 'Rita', 'Reader', ['reader']),
                    user(u.copyeditor, 'Carl', 'Copyeditor', ['copyeditor']),
                    user(u.ended, 'Ezra', 'Ended', [], endedReader()),
                ],
            });

            // The addresses as the scratch press's Press Manager's side menu holds them.
            const manager = await crash.page(asUser, u.manager);
            await manager.goto(`/index.php/${tag}/submissions`);
            await new EditorialChrome(manager).waitSideMenu();
            const side = await statsAddresses(manager);
            const addresses = [
                ['Editorial Activity', side['Editorial Activity']],
                ['Users', side['Users']],
                ['Reports', side['Reports']],
            ];
            expect(addresses[0][1], 'the side menu\'s "Editorial Activity"').toMatch(new RegExp(`/index\\.php/${tag}/stats/editorial`));
            expect(addresses[1][1], 'the side menu\'s "Users"').toMatch(new RegExp(`/index\\.php/${tag}/stats/users`));
            expect(addresses[2][1], 'the side menu\'s "Reports"').toMatch(new RegExp(`/index\\.php/${tag}/stats/reports`));

            // Author, Reviewer, Reader and Copyeditor: the access-denied page at
            // each of the three addresses (Actors rows 1, 3).
            for (const who of [u.author, u.reviewer, u.reader, u.copyeditor]) {
                const page = await crash.page(asUser, who);
                for (const [label, address] of addresses) {
                    await page.goto(address);
                    await expectAccessDenied(page, `${who} on "${label}"`);
                }
            }

            // The Reader whose role ended and the seeded press's Press Manager,
            // who holds no role here: "Editorial Activity" and "Users" are denied
            // too (Actors row 1).
            for (const who of [u.ended, 'manager.maya']) {
                const page = await crash.page(asUser, who);
                for (const [label, address] of addresses.slice(0, 2)) {
                    await page.goto(address);
                    await expectAccessDenied(page, `${who} on "${label}"`);
                }
            }

            // Signed out: the Login page at each address (Actors rows 1, 3).
            const visitorContext = crash.watch(await browser.newContext({baseURL, storageState: {cookies: [], origins: []}}));
            const visitor = await visitorContext.newPage();
            for (const [label, address] of addresses) {
                await visitor.goto(address);
                await expect(visitor, `signed out on "${label}"`).toHaveURL(/\/login/, {timeout: T});
                await expect(visitor.locator('form#login, form.cmp_form.login').first()).toBeVisible({timeout: T});
            }
            await visitorContext.close();

            // Control: the Press Manager opens each page. "Editorial Activity"
            // draws no ring, its total and every stage read 0; "Reports" shows
            // its heading (Fields; Rule 2).
            const activity = new EditorialActivityPage(manager, tag);
            await activity.goto(addresses[0][1]);
            await activity.expectChart(0, zeroStages());
            await activity.expectRing(false);
            const users = new UserStatsPage(manager, tag);
            await users.goto(addresses[1][1]);
            await expect(users.heading).toBeVisible();
            const reports = new EditorialReportsPage(manager, tag);
            await reports.goto(addresses[2][1]);
            await expect(reports.heading).toHaveText('Reports');
        });
    });

    test('S2: counting and exporting the press\'s users', async ({asUser, ompApi, baseURL}, testInfo) => {
        test.setTimeout(480_000);
        const crash = crashReplay(testInfo, baseURL);
        await crash.run(async () => {
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
            await ompApi.createContext({
                tag,
                users: [
                    user(u.manager, 'Mona', 'Manager', ['manager']),
                    user(u.se, 'Sid', 'Series', ['sectionEditor']),
                    user(u.nova, 'Nova', 'Novak', ['author', 'reader']),
                    user(u.otto, 'Otto', 'Ortiz', ['author']),
                    user(u.cora, 'Cora', 'Cole', ['copyeditor']),
                    user(u.pia, 'Pia', 'Pike', ['author'], {disabled: true}),
                    user(u.quinn, 'Quinn', 'Quill', [], endedReader()),
                ],
            });
            const expectedFigures = {
                'All Users': '6',
                'Press Manager': '2',
                'Series Editor': '1',
                Assistant: '1',
                Author: '2',
                Reviewer: '0',
                Reader: '1',
            };
            const counted = (rows) => Object.fromEntries(rows.filter(([name]) => name !== 'Site Administrator'));

            // "Users": the tab, the heading with "Export" at its right, the
            // columns, the rows in order with their counts; Pia and Quinn are
            // counted nowhere (Rules 14, 15; Fields; A6).
            const page = await crash.page(asUser, u.manager);
            await openFromSideMenu(page, tag, 'Users');
            const users = new UserStatsPage(page, tag);
            await users.arrived();
            await expect(page).toHaveTitle(/^User Statistics/);
            // The heading's words (not its box, which may span the row) and the button.
            const headingWords = await users.heading.evaluate((h) => {
                const range = document.createRange();
                range.selectNodeContents(h);
                const r = range.getBoundingClientRect();
                return {right: r.right, top: r.top, bottom: r.bottom};
            });
            const exportBox = await users.exportButton.boundingBox();
            expect(exportBox, '"Export" is drawn').toBeTruthy();
            expect(exportBox.x, '"Export" stands right of the heading').toBeGreaterThanOrEqual(headingWords.right);
            expect(exportBox.y, '"Export" on the heading\'s line').toBeLessThan(headingWords.bottom);
            expect(exportBox.y + exportBox.height, '"Export" on the heading\'s line').toBeGreaterThan(headingWords.top);
            await expect(users.columnHeaders()).toHaveText(['Name', 'Total']);
            await expect.poll(async () => (await users.readRows()).map(([name]) => name), {timeout: T}).toEqual(USERS_ROWS);
            const managerRows = await users.readRows();
            expect(counted(managerRows)).toEqual(expectedFigures);

            // The export window: it slides in from the right, "User Group", its
            // line, one ticked box per role of the press, then "Export" (Rule 16;
            // Fields).
            let win = await users.openExport();
            const viewport = page.viewportSize();
            const at = await win.position();
            expect(at && viewport, 'the window is drawn').toBeTruthy();
            expect(at.x, 'the window leaves the side menu\'s edge').toBeGreaterThan(0);
            expect(Math.round(at.x + at.width), 'the window meets the right edge').toBeGreaterThanOrEqual(viewport.width - 2);
            await expect(win.group).toBeVisible();
            await expect(win.description).toBeVisible();
            expect(await win.boxSet()).toEqual(byLabel(PRESS_ROLES.map((r) => [r, true])));
            await expect(win.exportButton).toBeVisible();
            const order = await win.dialog.evaluate((d) => {
                const text = d.textContent || '';
                const last = [...d.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === 'Export').pop();
                const firstBox = d.querySelector('input[type="checkbox"]');
                return {
                    group: text.indexOf('User Group'),
                    line: text.indexOf('Select the users to be exported to an Excel/CSV file.'),
                    boxBeforeExport: !!(firstBox && last && firstBox.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING),
                };
            });
            expect(order.group, '"User Group" is read').toBeGreaterThanOrEqual(0);
            expect(order.line, 'the line comes after "User Group"').toBeGreaterThan(order.group);
            expect(order.boxBeforeExport, 'the boxes come before "Export"').toBe(true);

            // Every role exported: the window closes and the file downloads, one
            // line per counted account, none for Pia or Quinn; Nova's line (Rule
            // 17; Fields).
            let file = await win.export();
            expect(file.name).toBe(`user-report-${TODAY}.csv`);
            expect(file.bom, 'the file starts with a byte-order mark').toBe(true);
            expect(userExportHeader(file.rows[0])).toEqual(userExportHeader([...USER_COLUMNS, ...PRESS_ROLES]));
            const everyone = [u.manager, u.se, u.nova, u.otto, u.cora].map(mailOf).concat('admin@mail.test');
            let lines = records(file.rows);
            expect(lines.map((l) => l['Email address']).sort()).toEqual([...everyone].sort());
            expect(lines.map((l) => l['Email address'])).not.toContain(mailOf(u.pia));
            expect(lines.map((l) => l['Email address'])).not.toContain(mailOf(u.quinn));
            const nova = lines.find((l) => l['Email address'] === mailOf(u.nova));
            expect(PRESS_ROLES.filter((r) => nova[r] === 'Yes')).toEqual(['Author', 'Reader']);
            expect(PRESS_ROLES.filter((r) => nova[r] !== 'Yes').every((r) => nova[r] === 'No'), 'every other role reads "No"').toBe(true);
            expect(nova['Date registered']).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
            expect([nova.Phone, nova.Country, nova['Mailing Address']]).toEqual(['', '', '']);

            // One role exported: the boxes as last left (all ticked); "Author"
            // alone gives Nova and Otto, the role columns unchanged (Rules 16, 17).
            win = await users.openExport();
            expect(await win.boxSet()).toEqual(byLabel(PRESS_ROLES.map((r) => [r, true])));
            await win.tickOnly(['Author']);
            file = await win.export();
            expect(userExportHeader(file.rows[0])).toEqual(userExportHeader([...USER_COLUMNS, ...PRESS_ROLES]));
            lines = records(file.rows);
            expect(lines.map((l) => l['Email address']).sort()).toEqual([mailOf(u.nova), mailOf(u.otto)].sort());

            // No role exported: "Author" alone is ticked, as last left; with
            // nothing ticked the window still exports the column names alone
            // (Rules 16, 17).
            win = await users.openExport();
            expect(await win.boxSet()).toEqual(byLabel(PRESS_ROLES.map((r) => [r, r === 'Author'])));
            await win.tickOnly([]);
            file = await win.export();
            expect(file.bom).toBe(true);
            expect(file.rows.map(userExportHeader)).toEqual([userExportHeader([...USER_COLUMNS, ...PRESS_ROLES])]);

            // The Series Editor sees the same rows and counts (Actors paragraph).
            const sePage = await crash.page(asUser, u.se);
            await openFromSideMenu(sePage, tag, 'Users');
            const seUsers = new UserStatsPage(sePage, tag);
            await seUsers.arrived();
            await expect.poll(() => seUsers.readRows(), {timeout: T}).toEqual(managerRows);

            // Control: reloaded, the window opens with every box ticked again
            // (Rule 16).
            await users.reload();
            win = await users.openExport();
            expect(await win.boxSet()).toEqual(byLabel(PRESS_ROLES.map((r) => [r, true])));
            await win.close();
        });
    });

    test('S3: the monthly statistics email', async ({asUser, ompApi, pkpMail, baseURL}, testInfo) => {
        test.setTimeout(600_000);
        const crash = crashReplay(testInfo, baseURL);
        await crash.run(async () => {
            const tag = makeTag('s3', testInfo);
            const u = {
                maya: `${tag}maya`,
                sol: `${tag}sol`,
                tess: `${tag}tess`,
                uma: `${tag}uma`,
                vic: `${tag}vic`,
                wes: `${tag}wes`,
            };
            await ompApi.createContext({
                tag,
                users: [
                    user(u.maya, 'Maya', 'Mayer', ['manager']),
                    user(u.sol, 'Sol', 'Solberg', ['sectionEditor']),
                    user(u.tess, 'Tess', 'Tamm', ['sectionEditor'], {notifications: {notificationEditorialReport: {email: false}}}),
                    user(u.uma, 'Uma', 'Ueda', ['sectionEditor'], {notifications: {notificationEditorialReport: {enabled: false}}}),
                    user(u.vic, 'Vic', 'Varga', ['manager'], {disabled: true}),
                    user(u.wes, 'Wes', 'Wong', ['author']),
                ],
            });
            await seedBook(ompApi, tag, 'ax', 'Axolotl', u.wes, {dateSubmitted: prevMonthDay(10)});
            await seedBook(ompApi, tag, 'bi', 'Bison', u.wes, {dateSubmitted: prevMonthDay(10)});
            await seedBook(ompApi, tag, 'ca', 'Caribou', u.wes, {dateSubmitted: prevMonthDay(12), decisions: ['sendExternalReview', 'accept']});
            await seedBook(ompApi, tag, 'eg', 'Egret', u.wes, {dateSubmitted: prevMonthDay(15), decisions: ['initialDecline']});
            await seedBook(ompApi, tag, 'ke', 'Kea', u.wes);

            await ompApi.runTask({task: 'statisticsReport', context: tag});

            // Maya's and Sol's email: one each, its subject, opening, figures,
            // closing, signature and footer (Rules 24, 25; Fields; A11).
            const mails = {};
            for (const [who, full] of [
                [u.maya, 'Maya Mayer'],
                [u.sol, 'Sol Solberg'],
            ]) {
                const box = await statisticsEmails(pkpMail, mailOf(who));
                expect(box, `${who}: one email`).toHaveLength(1);
                const mail = box[0];
                mails[who] = mail;
                expect(mail.subject).toBe(`Editorial activity for ${PREV_MONTH}`);
                const words = htmlWords(mail.html);
                expect(mail.text.trim().startsWith(`${full},`), `${who}'s email opens with the name: "${mail.text.slice(0, 80)}"`).toBe(true);
                expect(words).toContain(HEALTH_LINE(PREV_MONTH));
                expect(words).toContain('New submissions this month: 4');
                expect(words).toContain('Declined submissions this month: 1');
                expect(words).toContain('Accepted submissions this month: 1');
                expect(words).toContain('Total submissions in the system: 5');
                const closing = words.indexOf(CLOSING_TAIL);
                expect(closing, 'the closing').toBeGreaterThan(words.indexOf('Total submissions in the system: 5'));
                expect(words.indexOf('Sincerely,'), '"Sincerely," after the closing').toBeGreaterThan(closing);
                expect(mail.links.map((l) => l.text)).toContain('Unsubscribe');
                expect(words.lastIndexOf('Unsubscribe'), 'the footer after "Sincerely,"').toBeGreaterThan(words.indexOf('Sincerely,'));
            }

            // The attachment: a byte-order mark, three blocks; "Trends" for the
            // month and in total, rates as fractions, no yearly average; "Users"
            // (Rule 26; A9).
            const attachment = mails[u.maya].attachments.find((a) => a.name === 'editorial-report.csv');
            expect(attachment, 'editorial-report.csv is attached').toBeTruthy();
            expect(attachment.bom).toBe(true);
            const blocks = csvBlocks(attachment.rows);
            expect(blocks).toHaveLength(3);
            expect(blocks[0][0]).toEqual(['Active Submissions', 'Total']);
            expect(blocks[1][0]).toEqual(['Trends', PREV_MONTH, 'Total']);
            const trend = Object.fromEntries(blocks[1].slice(1).map((r) => [r[0], r.slice(1)]));
            expect(trend['Submissions Received']).toEqual(['4', '5']);
            expect(trend['Acceptance Rate']).toEqual(['0.5', '0.2']);
            expect(blocks[1].slice(1).filter((r) => /\/year/.test(r[2] || '')), 'no total carries a yearly average').toEqual([]);
            expect(blocks[2][0]).toEqual(['Users', 'Total']);
            expect(Object.fromEntries(blocks[2].slice(1))['All Users']).toBe('6');

            // The link: "editorial trends" in Sol's email opens "Editorial
            // Activity" (Fields).
            const solPage = await crash.page(asUser, u.sol);
            const trendsLink = mails[u.sol].links.find((l) => l.text === 'editorial trends');
            expect(trendsLink, 'Sol\'s email links "editorial trends"').toBeTruthy();
            expect(trendsLink.href).toContain(`/index.php/${tag}/stats/editorial`);
            const solActivity = new EditorialActivityPage(solPage, tag);
            await solActivity.goto(trendsLink.href);

            // Sol's Tasks entry: listed; pressed, it opens "Editorial Activity",
            // the bell counts one fewer and the entry stays (Rule 27).
            let {tasks, count: solBefore} = await openTasks(solPage, tag);
            await expect(tasks.row(KIND_REMINDER)).toHaveCount(1);
            await tasks.openTask(tasks.row(KIND_REMINDER));
            await solPage.waitForURL(/\/stats\/editorial/, {waitUntil: 'commit', timeout: T});
            await solActivity.arrived();
            await tasks.expectCount(solBefore - 1);
            await tasks.open();
            await expect(tasks.row(KIND_REMINDER)).toHaveCount(1);

            // Tess, Uma and Vic: no email (read after Maya's and Sol's arrived);
            // Tess's Tasks panel lists the entry, Uma's does not (Actors row 4;
            // Rule 28; Settings bullet 2).
            for (const who of [u.tess, u.uma, u.vic]) {
                expect(await statisticsEmailCount(pkpMail, mailOf(who)), `${who}: no email`).toBe(0);
            }
            const tessPage = await crash.page(asUser, u.tess);
            ({tasks} = await openTasks(tessPage, tag));
            await expect(tasks.row(KIND_REMINDER)).toHaveCount(1);
            const umaPage = await crash.page(asUser, u.uma);
            ({tasks} = await openTasks(umaPage, tag));
            await expect(tasks.grid()).toBeVisible();
            await expect(tasks.row(KIND_REMINDER)).toHaveCount(0);

            // Sol's "Unsubscribe": the page lists every email of Profile ›
            // "Notifications", all ticked; after "Unsubscribe" the row reads "Do
            // not send me an email…" ticked (Rule 28a).
            const solProfile = new ProfilePage(solPage, tag);
            await solProfile.goto('notifications');
            let profileSentences = [];
            await expect
                .poll(async () => (profileSentences = await solProfile.notificationSentences()), {timeout: T})
                .toContain(STATS_SUMMARY);
            const unsubscribeLink = mails[u.sol].links.find((l) => l.text === 'Unsubscribe');
            const unsubscribe = new UnsubscribePage(solPage);
            await unsubscribe.goto(unsubscribeLink.href);
            const labels = await unsubscribe.boxLabels();
            expect(labels).toContain(STATS_SUMMARY);
            expect([...labels].sort()).toEqual([...profileSentences].sort());
            const boxes = unsubscribe.boxes();
            await expect(boxes).toHaveCount(labels.length);
            for (let i = 0; i < labels.length; i++) await expect(boxes.nth(i), labels[i]).toBeChecked();
            await unsubscribe.unsubscribe();
            await expect(unsubscribe.successHeading).toBeVisible({timeout: T});
            await solProfile.goto('notifications');
            const solPair = solProfile.notificationPair('notificationEditorialReport');
            await expect(solPair.email).toBeChecked();
            await expect(solPair.allow).toBeChecked();

            // A second run: Maya's second email, none more for Sol; Sol's panel
            // lists two entries and the bell counts one more (Rules 27, 28a).
            await ompApi.runTask({task: 'statisticsReport', context: tag});
            expect(await statisticsEmails(pkpMail, mailOf(u.maya), {atLeast: 2})).toHaveLength(2);
            expect(await statisticsEmailCount(pkpMail, mailOf(u.sol)), 'Sol: still one email').toBe(1);
            ({tasks} = await openTasks(solPage, tag));
            await expect(tasks.row(KIND_REMINDER)).toHaveCount(2);
            await tasks.close();
            await tasks.expectCount(solBefore);

            // Control: Wes gets neither the email nor the entry after either run
            // (Actors row 4).
            expect(await statisticsEmailCount(pkpMail, mailOf(u.wes)), 'Wes: no email').toBe(0);
            const wesPage = await crash.page(asUser, u.wes);
            ({tasks} = await openTasks(wesPage, tag));
            await expect(tasks.grid()).toBeVisible();
            await expect(tasks.row(KIND_REMINDER)).toHaveCount(0);
        });
    });

    test('S4: a press that sends no monthly email', async ({asUser, ompApi, pkpMail, baseURL}, testInfo) => {
        test.setTimeout(480_000);
        const crash = crashReplay(testInfo, baseURL);
        await crash.run(async () => {
            const tag = makeTag('s4', testInfo);
            const u = {manager: `${tag}mg`, se: `${tag}se`, author: `${tag}au`};
            await ompApi.createContext({
                tag,
                editorialStatsEmail: false,
                users: [
                    user(u.manager, 'Mona', 'Manager', ['manager']),
                    user(u.se, 'Sid', 'Series', ['sectionEditor']),
                    user(u.author, 'Ada', 'Author', ['author']),
                ],
            });
            await seedBook(ompApi, tag, 'ax', 'Axolotl', u.author, {dateSubmitted: prevMonthDay(10)});
            const editorsRows = async (profile) => ((await profile.notificationTable()).find((g) => g.group === 'Editors') || {rows: []}).rows;

            // The Series Editor's Profile: "Editors" without the row; the tab is
            // left unsaved (Settings bullet 1; A14).
            const sePage = await crash.page(asUser, u.se);
            const profile = new ProfilePage(sePage, tag);
            await profile.goto('notifications');
            await expect.poll(() => editorsRows(profile), {timeout: T}).toContain('Weekly email of outstanding tasks');
            expect(await editorsRows(profile)).not.toContain(STATS_SUMMARY);

            // A run while off: no Tasks entry for the Series Editor (the mail
            // is read after the run while on, below) (Rules 24, 27).
            await ompApi.runTask({task: 'statisticsReport', context: tag});
            let {tasks} = await openTasks(sePage, tag);
            await expect(tasks.grid()).toBeVisible();
            await expect(tasks.row(KIND_REMINDER)).toHaveCount(0);

            // Switched back on, on screen.
            const mgrPage = await crash.page(asUser, u.manager);
            const emails = new WorkflowEmailsSettingsPage(mgrPage, tag);
            await emails.goto();
            const choice = mgrPage.getByRole('group', {name: 'Editorial statistics'});
            await choice.getByRole('radio', {name: 'Send a monthly email to editors.', exact: true}).check();
            await emails.save();

            // The row returns, "Enable…" ticked, "Do not send…" unticked
            // (Settings bullets 1, 2).
            await profile.goto('notifications');
            await expect.poll(() => editorsRows(profile), {timeout: T}).toContain(STATS_SUMMARY);
            const pair = profile.notificationPair('notificationEditorialReport');
            await expect(pair.allow).toBeChecked();
            await expect(pair.email).not.toBeChecked();

            // A run while on: one email each (so none from the run while off),
            // "New submissions this month: 1", and the Tasks entry (Rules 24,
            // 25, 27).
            await ompApi.runTask({task: 'statisticsReport', context: tag});
            for (const who of [u.manager, u.se]) {
                const box = await statisticsEmails(pkpMail, mailOf(who));
                expect(box, `${who}: one email from the two runs`).toHaveLength(1);
                expect(box[0].subject).toBe(`Editorial activity for ${PREV_MONTH}`);
                expect(htmlWords(box[0].html)).toContain('New submissions this month: 1');
            }
            ({tasks} = await openTasks(sePage, tag));
            await expect(tasks.row(KIND_REMINDER)).toHaveCount(1);

            // Control: the Author gets no email from either run (Actors row 4).
            expect(await statisticsEmailCount(pkpMail, mailOf(u.author)), 'the Author: no email').toBe(0);
        });
    });

    test('S5: yearly averages in "Total"', async ({asUser, ompApi, baseURL}, testInfo) => {
        test.setTimeout(480_000);
        const crash = crashReplay(testInfo, baseURL);
        await crash.run(async () => {
            const tag = makeTag('s5', testInfo);
            const u = {manager: `${tag}mg`, author: `${tag}au`};
            await ompApi.createContext({
                tag,
                users: [user(u.manager, 'Mona', 'Manager', ['manager']), user(u.author, 'Ada', 'Author', ['author'])],
            });
            const march = (yearsAgo) => `${YEAR - yearsAgo}-03-01`;
            await seedBook(ompApi, tag, 'al', 'Alpha', u.author, {dateSubmitted: march(3)});
            await seedBook(ompApi, tag, 'be', 'Beta', u.author, {dateSubmitted: march(2)});
            await seedBook(ompApi, tag, 'ga', 'Gamma', u.author, {dateSubmitted: march(2), decisions: ['sendExternalReview', 'decline']});
            await seedBook(ompApi, tag, 'de', 'Delta', u.author, {dateSubmitted: march(1)});
            await seedBook(ompApi, tag, 'ep', 'Epsilon', u.author, {dateSubmitted: march(1)});
            await seedBook(ompApi, tag, 'ze', 'Zeta', u.author);

            // "Total": "6 (2/year)"; the one decline without an average; the
            // rows at 0 without one (Rules 8, 8a).
            const page = await crash.page(asUser, u.manager);
            await openFromSideMenu(page, tag, 'Editorial Activity');
            const activity = new EditorialActivityPage(page, tag);
            await activity.arrived();
            const totals = {
                'Submissions Received': '6 (2/year)',
                'Submissions Declined': '1',
                'Submissions Declined (After Review)': '1',
                'Submissions Accepted': '0',
                'Submissions Declined (Desk Reject)': '0',
                'Submissions Published': '0',
            };
            await activity.expectColumn('total', totals);

            // "Last two years" (Rules 3, 7, 8c).
            await activity.choosePreset('Last two years');
            await expect(activity.trendsColumns()).toHaveText(['Name', `${YEAR - 2}-01-01 — ${YEAR - 1}-12-31`, 'Total']);
            await activity.expectColumn('middle', {'Submissions Received': '4', 'Submissions Declined': '1'});
            await activity.expectColumn('total', totals);

            // "Last year" (Rules 3, 7).
            await activity.choosePreset('Last year');
            await expect(activity.trendsColumns()).toHaveText(['Name', `${YEAR - 1}-01-01 — ${YEAR - 1}-12-31`, 'Total']);
            await activity.expectColumn('middle', {'Submissions Received': '2', 'Submissions Declined': '0'});
            await activity.expectColumn('total', totals);

            // Control: "Year to date" ends yesterday, so "Zeta" is not in it
            // (Rules 3, 7).
            await activity.choosePreset('Year to date');
            await expect(activity.trendsColumns()).toHaveText(['Name', `${YEAR}-01-01 — ${utcDay(1)}`, 'Total']);
            await activity.expectColumn('middle', {'Submissions Received': '0'});
        });
    });

    test('S6: reading "Editorial Activity"', async ({asUser, ompApi, baseURL}, testInfo) => {
        test.setTimeout(600_000);
        const crash = crashReplay(testInfo, baseURL);
        await crash.run(async () => {
            const tag = makeTag('s6', testInfo);
            const u = {manager: `${tag}mg`, se: `${tag}se`, author: `${tag}au`};
            await ompApi.createContext({
                tag,
                users: [
                    user(u.manager, 'Mona', 'Manager', ['manager']),
                    user(u.se, 'Sid', 'Series', ['sectionEditor']),
                    user(u.author, 'Ada', 'Author', ['author']),
                ],
            });
            const last = (mmdd) => `${YEAR - 1}-${mmdd}`;
            const book = (key, title, extra) => seedBook(ompApi, tag, key, title, u.author, extra);
            for (const key of ['q1', 'q2', 'q3', 'q4']) await book(key, `Queued ${key}`, {dateSubmitted: last('03-15')});
            await book('bi', 'Bison', {dateSubmitted: last('04-20'), decisions: ['sendExternalReview']});
            await book('ca', 'Caribou', {dateSubmitted: last('05-10'), decisions: ['sendExternalReview', 'accept']});
            await book('di', 'Dingo', {dateSubmitted: last('06-05'), decisions: ['sendExternalReview', 'accept', 'sendToProduction']});
            const egret = await book('eg', 'Egret', {dateSubmitted: last('07-12'), decisions: ['initialDecline']});
            await book('fe', 'Ferret', {dateSubmitted: last('08-08'), decisions: ['sendExternalReview', 'decline']});
            await book('ge', 'Gecko', {dateSubmitted: last('09-03'), decisions: ['sendExternalReview', 'accept', 'sendToProduction'], published: true});
            await book('he', 'Heron', {dateSubmitted: last('09-20'), published: true, datePublished: last('02-01')});
            await book('ib', 'Ibis', {submitted: false});

            // On arrival: the chart, the columns, the sixteen rows; "Total"; the
            // middle column at 0 (Rules 1–3, 6, 6a, 7b, 8a, 9, 10; A3).
            const page = await crash.page(asUser, u.manager);
            await openFromSideMenu(page, tag, 'Editorial Activity');
            const activity = new EditorialActivityPage(page, tag);
            await activity.arrived();
            const chart = [
                ['Submission', 4],
                ['Internal Review', 0],
                ['External Review', 1],
                ['Copyediting', 1],
                ['Production', 1],
            ];
            await activity.expectChart(7, chart);
            await activity.expectRing(true);
            await expect(activity.trendsColumns()).toHaveText(['Name', RANGE_90(), 'Total']);
            await activity.expectRowNames(TRENDS_ROWS);
            const arrivalTotals = ['10', '3', '2', '1', '1', '1', '2', '1', '1', '0', '0', '0', '30%', '20%', '10%', '10%'];
            await expect.poll(() => activity.columnValues('total'), {timeout: T}).toEqual(arrivalTotals);
            await expect.poll(() => activity.columnValues('middle'), {timeout: T}).toEqual([...Array(12).fill('0'), '0%', '0%', '0%', '0%']);

            // The presets: four and "Custom Range", no "All dates" (Rule 3).
            await activity.openRangeList();
            await expect(activity.presets).toHaveText(['Last 90 days', 'Year to date', 'Last year', 'Last two years']);
            await expect(activity.customRangeLegend()).toHaveText('Custom Range');
            await expect(activity.presets.filter({hasText: 'All dates'})).toHaveCount(0);

            // "Last year": the heading, the figures; "Total" and the chart stay
            // (Rules 2, 3, 7, 7b, 9).
            await activity.choosePreset('Last year');
            await expect(activity.trendsColumns()).toHaveText(['Name', `${YEAR - 1}-01-01 — ${YEAR - 1}-12-31`, 'Total']);
            await activity.expectColumn('middle', {
                'Submissions Received': '10',
                'Submissions Accepted': '3',
                'Submissions Declined': '2',
                'Submissions Declined (Desk Reject)': '1',
                'Submissions Declined (After Review)': '1',
                'Submissions Published': '1',
                'Other Submissions': '1',
                'Submissions In Progress': '0',
                'Imported Submissions': '1',
                'Acceptance Rate': '60%',
                'Rejection Rate': '40%',
                'Desk Reject Rate': '20%',
                'After Review Reject Rate': '20%',
            });
            await expect.poll(() => activity.columnValues('total'), {timeout: T}).toEqual(arrivalTotals);
            await activity.expectChart(7, chart);

            // A Custom Range, 1 June to 30 September of last year (Rules 2, 3, 7, 9).
            await activity.applyCustomRange(last('06-01'), last('09-30'));
            await expect(activity.trendsColumns()).toHaveText(['Name', `${last('06-01')} — ${last('09-30')}`, 'Total']);
            await activity.expectColumn('middle', {
                'Submissions Received': '4',
                'Submissions Accepted': '2',
                'Submissions Declined': '2',
                'Submissions Declined (Desk Reject)': '1',
                'Submissions Declined (After Review)': '1',
                'Submissions Published': '1',
                'Other Submissions': '1',
                'Imported Submissions': '1',
                'Acceptance Rate': '50%',
                'Rejection Rate': '50%',
                'Desk Reject Rate': '25%',
                'After Review Reject Rate': '25%',
            });
            await activity.expectChart(7, chart);

            // Sub-rows: their names start further right than every other row's
            // (Rule 12).
            const starts = await activity.nameStarts();
            expect(Object.keys(starts)).toEqual(TRENDS_ROWS);
            const subStarts = SUB_ROWS.map((n) => starts[n]);
            const groupStarts = TRENDS_ROWS.filter((n) => !SUB_ROWS.includes(n)).map((n) => starts[n]);
            expect(Math.min(...subStarts), 'every sub-row starts right of every other row').toBeGreaterThan(Math.max(...groupStarts));

            // Information icons (Rule 11; A5, OMP2).
            expect(await activity.iconText('Other Submissions')).toBe(OTHER_TEXT);
            expect(await activity.iconText('Acceptance Rate')).toBe(RATE_TEXT);
            expect(await activity.iconText('Days to First Editorial Decision')).toMatch(new RegExp(`^${DAYS_TEXT_OPENING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `));

            // The Series Editor, assigned to nothing, sees the same chart and
            // "Total" (Actors paragraph).
            const sePage = await crash.page(asUser, u.se);
            await openFromSideMenu(sePage, tag, 'Editorial Activity');
            const seActivity = new EditorialActivityPage(sePage, tag);
            await seActivity.arrived();
            await seActivity.expectChart(7, chart);
            await expect.poll(() => seActivity.columnValues('total'), {timeout: T}).toEqual(arrivalTotals);

            // "Revert Decline" on "Egret", its email skipped: one decline less,
            // the chart at 8 (Rules 2, 6b).
            const modal = await openEditorial(page, tag, egret.submissionId);
            await decisionButton(modal, 'Revert Decline').click();
            const wizard = new DecisionWizardPage(page);
            // A one-page wizard: its heading is the decision's name alone.
            await expect(wizard.heading()).toHaveText('Revert Decline', {timeout: T});
            await wizard.skipEmail();
            await expect(wizard.skippedNotice()).toBeVisible({timeout: T});
            await wizard.recordDecision('Submission Reactivated');
            await activity.goto();
            await activity.expectColumn('total', {'Submissions Declined': '1', 'Submissions Declined (Desk Reject)': '0'});
            await expect(activity.totalHeading).toHaveText(/^\s*8\s*Active Submissions\s*$/, {timeout: T});

            // Control: "Submissions Received" still 10 (Rule 6).
            await activity.expectColumn('total', {'Submissions Received': '10'});
        });
    });

    test('S7: downloading the reports', async ({asUser, ompApi, baseURL}, testInfo) => {
        test.setTimeout(480_000);
        const crash = crashReplay(testInfo, baseURL);
        await crash.run(async () => {
            const tag = makeTag('s7', testInfo);
            const u = {manager: `${tag}mg`, rhea: `${tag}rhea`, saul: `${tag}saul`, author: `${tag}au`};
            await ompApi.createContext({
                tag,
                context: {acronym: 'J-PK'},
                users: [
                    user(u.manager, 'Mona', 'Manager', ['manager']),
                    user(u.rhea, 'Rhea', 'Rivers', ['externalReviewer']),
                    user(u.saul, 'Saul', 'Stone', ['externalReviewer']),
                    user(u.author, 'Ada', 'Author', ['author']),
                ],
            });
            await seedBook(ompApi, tag, 'de', 'Delta notes', u.author, {
                decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: [{username: u.rhea, status: 'invited'}]}],
            });
            await seedBook(ompApi, tag, 'ma', 'Marsh survey', u.author, {
                contributors: [{givenName: 'Greta', familyName: 'Braun', email: mailOf(`${tag}greta`), country: 'DE'}],
                decisions: ['sendExternalReview', 'accept'],
                reviewRounds: [
                    {
                        reviewers: [
                            {username: u.rhea, status: 'completed', comments: 'Clear and well argued.'},
                            {username: u.saul, status: 'declined'},
                        ],
                    },
                ],
                participants: [{username: 'admin', role: 'manager'}],
            });
            await seedBook(ompApi, tag, 'ke', 'Kelp draft', u.author, {submitted: false});

            // "Reports": the heading, the line, the press's two links (Rule 18;
            // Fields).
            const page = await crash.page(asUser, u.manager);
            await openFromSideMenu(page, tag, 'Reports');
            const reports = new EditorialReportsPage(page, tag);
            await reports.arrived();
            await expect(reports.heading).toHaveText('Reports');
            await expect(reports.line).toHaveText(REPORTS_LINE);
            await reports.expectLinkSet(REPORT_LINKS);
            const address = page.url();

            // "Monograph Report": downloaded at once, the page as it was; the
            // columns (to "(Author 2)" at least, OMP3); one line per book, the
            // draft included (Rules 19, 20, 23; Fields).
            const monographs = await reports.download('Monograph Report');
            expect(monographs.name).toBe(`monographs-JPK-${FILE_DAY}.csv`);
            await expect(page).toHaveURL(address);
            await expect(reports.heading).toHaveText('Reports');
            await reports.expectLinkSet(REPORT_LINKS);
            expect(monographs.bom).toBe(true);
            const columns = monographs.rows[0];
            expect(emailHeadings(columns).slice(0, MONOGRAPH_COLUMNS.length)).toEqual(MONOGRAPH_COLUMNS);
            expect(emailHeadings(columns).slice(MONOGRAPH_COLUMNS.length, MONOGRAPH_COLUMNS.length + 16)).toEqual([...authorColumns(1), ...authorColumns(2)]);
            const books = records(monographs.rows);
            expect(books.map((b) => b.Title).sort()).toEqual(['Delta notes', 'Kelp draft', 'Marsh survey']);

            // "Marsh survey"'s line: its second author, "Copyediting", the Site
            // Administrator as Editor 1 with its two decisions, oldest first
            // (Rules 20a–20c, 23).
            const marsh = books.find((b) => b.Title === 'Marsh survey');
            expect([marsh['Given Name (Author 2)'], marsh['Family Name (Author 2)']]).toEqual(['Greta', 'Braun']);
            expect(marsh.Status).toBe('Copyediting');
            expect([marsh['Given Name (Editor 1)'], marsh['Family Name (Editor 1)']]).toEqual(['admin', 'admin']);
            expect([marsh['Editor Decision 1 (Editor 1)'], marsh['Editor Decision 2 (Editor 1)']]).toEqual(['Send to External Review', 'Accept Submission']);
            const decided = [marsh['Date decided 1 (Editor 1)'], marsh['Date decided 2 (Editor 1)']];
            for (const d of decided) expect(d).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
            expect(decided[0] <= decided[1], 'the older decision first').toBe(true);

            // "Delta notes"'s line: "External Review", its "(Author 2)" cells
            // empty (Rules 20a, 20c, 23).
            const delta = books.find((b) => b.Title === 'Delta notes');
            expect(delta.Status).toBe('External Review');
            expect(authorColumns(2).map((c) => delta[c])).toEqual(Array(8).fill(''));

            // "Review Report": three lines, "Delta notes"'s first; the stage,
            // Rhea's and Saul's lines (Rules 21, 21a, 21b, 21d).
            const reviews = await reports.download('Review Report');
            expect(reviews.name).toBe(`reviews-${FILE_DAY}.csv`);
            expect(reviews.bom).toBe(true);
            expect(emailHeadings(reviews.rows[0])).toEqual(REVIEW_COLUMNS);
            const assignments = records(reviews.rows);
            expect(assignments.map((a) => a['Submission Title'])).toEqual(['Delta notes', 'Marsh survey', 'Marsh survey']);
            expect(assignments.map((a) => a.Stage)).toEqual(['External Review', 'External Review', 'External Review']);
            const rheaMarsh = assignments.find((a) => a['Submission Title'] === 'Marsh survey' && a.Reviewer === u.rhea);
            expect(rheaMarsh, 'Rhea\'s line for "Marsh survey"').toBeTruthy();
            expect({
                Declined: rheaMarsh.Declined,
                Cancelled: rheaMarsh.Cancelled,
                Consideration: rheaMarsh.Consideration,
                Comments: rheaMarsh['Comments On Submission'],
                Recommendation: rheaMarsh.Recommendation,
            }).toEqual({Declined: 'No', Cancelled: 'No', Consideration: 'Never', Comments: '<p>Clear and well argued.</p>', Recommendation: ''});
            const saulMarsh = assignments.find((a) => a['Submission Title'] === 'Marsh survey' && a.Reviewer === u.saul);
            expect(saulMarsh, 'Saul\'s line for "Marsh survey"').toBeTruthy();
            expect(saulMarsh.Declined).toBe('Yes');
            const rheaDelta = assignments.find((a) => a['Submission Title'] === 'Delta notes');
            expect([rheaDelta.Reviewer, rheaDelta.Declined]).toEqual([u.rhea, 'No']);

            // Control: "Kelp draft", in "Monograph Report" above, has no line
            // here (Rule 21).
            expect(assignments.filter((a) => a['Submission Title'] === 'Kelp draft')).toEqual([]);

            // The Plugins tab: every report's box ticked and locked; the review
            // report's "Reports" link downloads the same file (Actors row 3;
            // Rule 18).
            const plugins = new WebsitePluginsPage(page, tag);
            await plugins.goto();
            const reportPlugins = (await plugins.list.read()).find((c) => c.heading === 'Report Plugins');
            expect(reportPlugins, 'the "Report Plugins" group').toBeTruthy();
            expect(reportPlugins.rows.length).toBeGreaterThan(0);
            expect(reportPlugins.rows.map((r) => [r.name, r.ticked, r.locked])).toEqual(reportPlugins.rows.map((r) => [r.name, true, true]));
            await plugins.list.openArrow('ReviewReportPlugin');
            const again = await downloadFromLink(page, plugins.list.rowLink('ReviewReportPlugin', 'Reports'));
            expect(again.name).toBe(`reviews-${FILE_DAY}.csv`);
            expect(emailHeadings(again.rows[0])).toEqual(REVIEW_COLUMNS);
            expect(records(again.rows).map((a) => [a['Submission Title'], a.Reviewer, a.Declined]).sort()).toEqual(
                assignments.map((a) => [a['Submission Title'], a.Reviewer, a.Declined]).sort()
            );
        });
    });
});
