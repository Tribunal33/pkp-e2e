// @ts-check
/**
 * @file playwright/tests/serial/U61-system-administration.spec.js
 *
 * System administration & jobs — OJS suite: scenarios 1–9 (all common).
 * Spec: docs/specs/U61-system-administration.md
 *
 * Serial project (PRINCIPLES A7, A9): the suite reads and changes what the
 * whole fleet shares, the job queue, the failed-job list, the sessions,
 * the stored copies and the routine tasks' logs. S3 ("Expire User
 * Sessions" signs out every session of the fleet), S8 ("Requeue All
 * Failed Jobs" acts on every failed job of the fleet) and S9 ("Delete
 * Task Logs" empties every test's task logs) carry `@solo` and run alone
 * in the `ojs-solo` project (harness.md "Project chain"; spec footnote
 * sc). S5–S7 share one worker, in order (`mode: 'default'`): S6 tells the
 * job "Try Again" puts back from every other waiting test job by the
 * numbers on the Jobs page before and after, and only this suite puts
 * test jobs on that queue (scenarios.md "POST scenarios/job").
 *
 * Not asserted here, by register ID: A1, A4, A5, A6 (the register carries
 * them, the spec's Coverage section); A2 and A3 are passed by S4, S7 and
 * S9, which read the pages as the spec gives them (no message, nothing
 * asks first).
 *
 * Seeding (footnote sc): the Site Administrator is `admin`, the Journal
 * Manager `manager.maya`, each opened through `asUser`; a signed-out
 * visitor is a browser context with an empty storage state (patterns.md
 * "Fixture selection", parallel lesson 8). Jobs come from
 * `pkpApi.createJob` (`{id, uuid, queue, connection, displayName}`) and
 * are found by their `id`, through the page links when a list runs past
 * 50 rows; S9's task run from `pkpApi.runTask`, its report found in
 * Mailpit by the run's code in the subject.
 */
const fs = require('fs');
const {test: base, expect} = require('../../support/fixtures.js');
const {LoginPage} = require('../../../../../shared/playwright/pages/LoginPage.js');
const {
    AdministrationPage,
    SystemInfoPage,
    JobsPage,
    FailedJobsPage,
    FailedJobDetailsPage,
} = require('../../../../../shared/playwright/pages/AdminPages.js');

const T = 30_000;

// ---- the OJS words ------------------------------------------------------------------
const APP_NAME = 'Open Journal Systems';
const CONFIG_TITLE = 'OJS Configuration';
const JOURNAL = 'publicknowledge';

/** Administration's panels, top to bottom: heading, text, controls (Fields). */
const PANELS = [
    ['Site Management', 'Add, edit or remove journals from this site and manage site-wide settings.', ['Hosted Journals', 'Site Settings']],
    [
        'System Information',
        'View information about the version and configuration settings of the application and server.',
        ['View System Information'],
    ],
    [
        'Expire User Sessions',
        'All users will be immediately logged out of the application, including you, and will need to login again.',
        ['Expire User Sessions'],
    ],
    [
        'Delete Caches',
        'Delete cache files from the system. This should only be done in development environments.',
        ['Delete Data Caches', 'Delete Template Cache'],
    ],
    ['Clear Scheduled Task Logs', 'Delete all logs of scheduled tasks processes that have been run.', ['Delete Task Logs']],
    ['Jobs', 'View all of the queued jobs in the system and track failed attempts.', ['View Jobs', 'View Failed Jobs']],
];

const ROLE_DENIED = 'The current role does not have access to this operation.';
const ACCESS_DENIED = 'Access denied.';

const CONFIRM_EXPIRE =
    'Are you sure you want to expire all user sessions? All users who are currently logged into the system will be forced to log in again (yourself included).';
const CONFIRM_TEMPLATES = 'Are you sure you want to clear the cache of compiled templates?';
const CONFIRM_TASK_LOGS = 'Are you sure you want to delete all scheduled task execution logs?';

const REDISPATCHED = 'Failed job redispatched successfully.';
const DELETED = 'Failed job deleted successfully from failed list.';
const REQUEUED = 'All redispatchable failed jobs with valid payload have been requeued successfully.';

const JOBS_COLUMNS = ['ID', 'Job', 'Queue', 'Attempts', 'Created At'];
const FAILED_COLUMNS = ['ID', 'Job', 'Queue', 'Connection', 'Failed At', 'Actions'];
const DETAILS_ROWS = ['ID', 'Job', 'Queue', 'Connection', 'Failed At', 'Payload', 'Exception'];
const JOBS_LINE = /^There's a total of (\d+) job\(s\) on the queue$/;
const FAILED_LINE = /^There's a total of (\d+) failed job\(s\)\.$/;
const CREATED_AT = /^Created at \d{4}-\d{2}-\d{2} \d{1,2}:\d{2}:\d{2} GMT\+0000 0$/;
const FAILED_AT = /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}:\d{2} UTC 0$/;

/** The site's principal contact as installed (footnote sc). */
const CONTACT = {Name: APP_NAME, Address: 'admin@mail.test'};
const TASK_NAME = 'Update DB-IP city lite database';
const REPORT_BODY = new RegExp(
    `^Your ${APP_NAME} installation automatically executed and finished this task and you can download the log file here: (\\S+)$`,
);

/** A signed-out visitor: a browser context with no session at all (parallel lesson 8). */
const test = base.extend({
    newVisitor: async ({browser, baseURL}, use) => {
        const made = [];
        await use(async () => {
            const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'});
            made.push(context);
            return context.newPage();
        });
        for (const context of made) {
            await context.close();
        }
    },
});

/** A signed-in page for an actor (a fresh `asUser` context). */
async function signedIn(asUser, username) {
    return (await asUser(username)).newPage();
}

/** A text as one line, white space collapsed. */
const flat = (text) => (text || '').replace(/\s+/g, ' ').trim();

/** The access-denied page for a role without the Site Administrator's. */
async function expectRoleDenied(page) {
    await expect(page.getByText(ROLE_DENIED, {exact: true})).toBeVisible({timeout: T});
    await expect(page).toHaveURL(/\/index\.php\/index\/[a-z_A-Z]+\/user\/authorizationDenied/);
}

/** The Login page, the form on screen. */
async function expectLoginPage(page) {
    await expect(page).toHaveURL(/\/login(\?|$)/);
    await expect(new LoginPage(page).form).toBeVisible({timeout: T});
}

/** A list's total line and its bold number match the list the page loaded. */
async function expectTotal(list, pattern, total) {
    const line = await list.totalLine();
    await expect(line).toHaveText(pattern);
    await expect(await list.totalBold()).toHaveText(String(total));
}

/** The new number of a test job put back on the queue: the Jobs rows now, less the rows before. */
function newTestJobs(before, after, job) {
    const seen = new Set(before.map((row) => row.id));
    return after.filter((row) => !seen.has(row.id) && row.queue === job.queue && row.displayName === job.displayName);
}

/** A colour that reads as red: its red channel well above the other two. */
function isRed(rgb) {
    const [r, g, b] = (rgb.match(/\d+/g) || []).map(Number);
    return r > 120 && r > g + 60 && r > b + 60;
}

/** The newest notice sits at the top right of the window. */
async function expectTopRight(page, locator) {
    const box = await locator.boundingBox();
    const view = page.viewportSize() || {width: 1280, height: 720};
    expect(box, 'the notice is laid out').not.toBeNull();
    if (box) {
        expect(box.x + box.width / 2).toBeGreaterThan(view.width / 2);
        expect(box.y + box.height / 2).toBeLessThan(view.height / 2);
    }
}

/**
 * Open a report's log link in a page and wait for its download; returns
 * the file's text.
 */
async function downloadLog(page, link) {
    const downloaded = page.waitForEvent('download', {timeout: T});
    // A link that downloads never finishes loading as a page.
    await page.goto(link).catch((error) => {
        if (!/Download is starting/.test(String(error))) {
            throw error;
        }
    });
    const download = await downloaded;
    const file = await download.path();
    return fs.readFileSync(file, 'utf8');
}

test.describe('system administration', () => {
    test('S1: who reaches Administration', async ({asUser, newVisitor}) => {
        test.slow();
        const ap = await signedIn(asUser, 'admin');
        const mp = await signedIn(asUser, 'manager.maya');
        const vp = await newVisitor();
        const admin = new AdministrationPage(ap);

        // The page: from the user menu on the site's home page (Rule 1; Fields).
        await ap.goto('/index.php/index/en');
        await admin.gotoFromUserMenu('admin');
        const address = new URL(ap.url()).pathname;
        await expect(admin.heading).toHaveText('Administration');
        await expect(ap).toHaveTitle(/^Site Administration( \| .+)?$/);
        await expect(admin.editorialHeader).toBeVisible();
        await expect(admin.trail).toHaveCount(0);
        await expect(admin.sideMenu).toHaveCount(0);
        await expect(admin.panelHeadings).toHaveText(PANELS.map(([heading]) => heading));
        for (const [heading, text, controls] of PANELS) {
            await expect(admin.panelText(heading)).toHaveText(text);
            await expect(admin.panelControls(heading)).toHaveText(controls);
        }

        // The trail: System Information, Jobs, Failed Jobs, each back to
        // Administration by its first step (Rule 2).
        for (const [link, name] of [
            ['View System Information', 'System Information'],
            ['View Jobs', 'Jobs'],
            ['View Failed Jobs', 'Failed Jobs'],
        ]) {
            await admin.link(link).click();
            await expect(admin.heading).toHaveText(name, {timeout: T});
            await expect(admin.trailItems).toHaveText([/^\s*Administration\b/, name]);
            await expect(admin.trailLinks).toHaveText(['Administration']);
            await admin.backToAdministration();
            await expect(admin.trail).toHaveCount(0);
        }

        // A journal's path in the address: "Access denied." (Rule 3).
        await ap.goto(address.replace('/index.php/index/', `/index.php/${JOURNAL}/`));
        await expect(ap.getByText(ACCESS_DENIED, {exact: true})).toBeVisible({timeout: T});
        await expect(ap).toHaveURL(new RegExp(`/index\\.php/${JOURNAL}/[a-z_A-Z]+/user/authorizationDenied`));

        // The Journal Manager and the visitor at the four addresses (Actors row 1).
        const addresses = [
            address,
            new SystemInfoPage(ap, {configTitle: CONFIG_TITLE}).url(),
            new JobsPage(ap).url(),
            new FailedJobsPage(ap).url(),
        ];
        for (const target of addresses) {
            await mp.goto(target);
            await expectRoleDenied(mp);
            await expect(mp.locator('main h1', {hasText: /Administration|System Information|Jobs/})).toHaveCount(0);
        }
        for (const target of addresses) {
            await vp.goto(target);
            await expectLoginPage(vp);
        }

        // Control: the Site Administrator at the address with "index" (Rule 3).
        await ap.goto(address);
        await admin.expectOpen();
    });

    test('S2: System Information', async ({asUser}) => {
        const ap = await signedIn(asUser, 'admin');
        const admin = new AdministrationPage(ap);
        const info = new SystemInfoPage(ap, {configTitle: CONFIG_TITLE});
        await admin.goto();

        // The page, top to bottom (Rule 5; Fields).
        await admin.link('View System Information').click();
        await info.expectOpen();
        await expect(info.sectionHeadings).toHaveText([
            /^Current version: \d+\.\d+\.\d+\.\d+ \(.+\)$/,
            'Version history',
            'Server Information',
            CONFIG_TITLE,
        ]);
        await expect(info.checkForUpdates).toBeVisible();
        await expect(info.columns(info.versionHistory)).toHaveText(['Version', 'Major', 'Minor', 'Revision', 'Build', 'Date installed']);
        const versions = await info.rows(info.versionHistory);
        const current = (await info.currentVersion.innerText()).match(/^Current version: (\S+) /);
        expect(versions.map((row) => row[0])).toContain(current && current[1]);
        await expect(info.columns(info.serverInfo)).toHaveText(['Setting Name', 'Setting Value']);
        const server = await info.rows(info.serverInfo);
        expect(server.map((row) => row[0])).toEqual([
            'OS platform',
            'PHP version',
            'Apache version',
            'Database driver',
            'Database server version',
        ]);
        await expect(info.columns(info.configuration)).toHaveText(['Setting Name', 'Setting Value']);
        await expect(info.phpInfoLink).toBeVisible();
        // The links' order: "Check for updates" first, "Extended PHP Information" last.
        const links = await info.main.locator('a').evaluateAll((as) => as.map((a) => (a.textContent || '').trim()));
        expect(links.indexOf('Check for updates')).toBeLessThan(links.indexOf('Extended PHP Information'));
        expect(links[links.length - 1]).toBe('Extended PHP Information');
        // Nothing to type in, nothing to press; the links are there (positive control).
        await expect(info.main.getByRole('textbox')).toHaveCount(0);
        await expect(info.main.getByRole('combobox')).toHaveCount(0);
        await expect(info.main.getByRole('checkbox')).toHaveCount(0);
        await expect(info.main.getByRole('button')).toHaveCount(0);
        await expect(info.main.getByRole('link', {name: 'Extended PHP Information'})).toHaveCount(1);

        // The configuration table: sections in bold, the values as the file
        // gives them (Rule 7; Settings bullets 1, 2, 4).
        const sections = await info.configSections();
        const byName = Object.fromEntries(sections.map((s) => [s.section, s]));
        for (const name of ['general', 'database', 'queues']) {
            expect(byName[name], `section ${name}`).toBeTruthy();
            expect(byName[name].bold, `${name} in bold`).toBe(true);
            expect(byName[name].spans, `${name} spans the table`).toBe(true);
        }
        const value = (section, name) => {
            const pair = (byName[section] ? byName[section].settings : []).find(([n]) => n === name);
            return pair ? pair[1] : undefined;
        };
        expect(value('queues', 'job_runner')).toBe('');
        expect(value('queues', 'job_runner_cross_request_lock')).toBe('1');
        expect(value('queues', 'delete_failed_jobs_after')).toBe('180');
        const umask = sections.flatMap((s) => s.settings).filter(([n]) => n === 'umask');
        expect(umask).toEqual([['umask', '18']]);

        // Hidden values (Rule 7b).
        const hidden = '**************';
        expect(value('database', 'password')).toBe(hidden);
        expect(value('general', 'app_key')).toBe(hidden);
        expect(value('security', 'salt')).toBe(hidden);
        expect(value('security', 'api_key_secret')).toBe(hidden);

        // "Extended PHP Information": PHP's own page in a new tab, headed with
        // the version Server Information names (Rule 8).
        const php = server.find((row) => row[0] === 'PHP version');
        const tab = await info.openPhpInfo();
        await expect(tab.locator('h1').first()).toHaveText(`PHP Version ${php ? php[1] : ''}`);
        expect(tab.url()).toMatch(/\/admin\/phpinfo$/);
        await tab.close();

        // Control: "security" has no "password_timeout" row, the file leaves it
        // commented out; the same read finds "salt" (Settings preamble).
        await expect(info.heading).toHaveText('System Information');
        expect(value('security', 'password_timeout')).toBeUndefined();
        expect(value('security', 'salt')).toBeDefined();
    });

    test('S3: "Expire User Sessions" @solo', async ({asUser}) => {
        const ap = await signedIn(asUser, 'admin');
        const admin = new AdministrationPage(ap);
        const login = new LoginPage(ap);
        await admin.goto();

        // The box, then "OK": the site's Login page, no message (Rules 9, 9a).
        const expired = await admin.press('Expire User Sessions');
        expect(expired.dialogs).toEqual([CONFIRM_EXPIRE]);
        expect(expired.status).toBe(200);
        await expect(ap).toHaveURL(/\/index\.php\/index\/[a-z_A-Z]+\/login$/);
        await expect(ap.locator('.page_login h1')).toHaveText('Login');
        await expect(login.form).toBeVisible();
        // Only the required-fields line stands above the form; no error in it.
        await expect(ap.locator('.page_login > p')).toHaveCount(1);
        await expect(ap.locator('.pkp_form_error, .cmp_notification')).toHaveCount(0);

        // Signed in again with the password the account had (Rule 9b).
        await login.signIn('admin', 'admin');
        await admin.goto();

        // Control: "Cancel" leaves the page as it was, still signed in (Rule 9).
        const cancelled = await admin.pressAndCancel('Expire User Sessions');
        expect(cancelled.dialogs).toEqual([CONFIRM_EXPIRE]);
        expect(cancelled.stayed).toBe(true);
        await ap.reload();
        await admin.expectOpen();
        expect(cancelled.posts).toEqual([]);
    });

    test('S4: deleting the stored copies', async ({asUser}) => {
        const context = await asUser('admin');
        const ap = await context.newPage();
        const admin = new AdministrationPage(ap);
        await admin.goto();
        const journal = await context.newPage();
        const styles = [];
        journal.on('response', (response) => {
            if (response.request().resourceType() === 'stylesheet') {
                styles.push(response.status());
            }
        });
        // What the reader sees of the journal's home page: its title, header,
        // footer and the look the theme's style sheet gives them (a
        // server-rendered page, read once it has loaded).
        const look = async () => {
            await expect(journal.locator('header.pkp_structure_head')).toBeVisible({timeout: T});
            return {
                title: await journal.title(),
                ...(await journal.evaluate(() => {
                    const text = (selector) => {
                        const el = document.querySelector(selector);
                        return el ? /** @type {HTMLElement} */ (el).innerText.replace(/\s+/g, ' ').trim() : null;
                    };
                    const style = (selector, property) => {
                        const el = document.querySelector(selector);
                        return el ? getComputedStyle(el).getPropertyValue(property) : null;
                    };
                    return {
                        header: text('header.pkp_structure_head'),
                        footer: text('.pkp_structure_footer_wrapper'),
                        headerColour: style('header.pkp_structure_head', 'background-color'),
                        navColour: style('.pkp_navigation_primary_wrapper', 'background-color'),
                        font: style('body', 'font-family'),
                        sheets: document.styleSheets.length,
                    };
                })),
            };
        };
        await journal.goto(`/index.php/${JOURNAL}/en`);
        const before = await look();
        const page = await admin.mainText();

        // "Delete Data Caches": nothing asks; Administration again, no message (Rule 10; A2).
        const data = await admin.press('Delete Data Caches');
        expect(data.dialogs).toEqual([]);
        expect(data.status).toBe(200);
        await expect(ap).toHaveURL(/\/index\.php\/index\/[a-z_A-Z]+\/admin(\/index)?$/);
        expect(await admin.mainText()).toBe(page);
        await expect(ap.locator('.pkpNotification')).toHaveCount(0);

        // "Delete Template Cache": the box, "OK", Administration again, no message (Rule 11).
        const templates = await admin.press('Delete Template Cache');
        expect(templates.dialogs).toEqual([CONFIRM_TEMPLATES]);
        expect(templates.status).toBe(200);
        await expect(ap).toHaveURL(/\/index\.php\/index\/[a-z_A-Z]+\/admin(\/index)?$/);
        expect(await admin.mainText()).toBe(page);
        await expect(ap.locator('.pkpNotification')).toHaveCount(0);

        // The journal's home page, reloaded: as before, its style sheets built
        // again and served (Rules 10, 11).
        styles.length = 0;
        await journal.reload();
        expect(await look()).toEqual(before);
        expect(styles.length).toBeGreaterThan(0);
        expect(styles.filter((status) => status >= 400)).toEqual([]);

        // Control: "Cancel" leaves the page as it was (Rule 11).
        const cancelled = await admin.pressAndCancel('Delete Template Cache');
        expect(cancelled.dialogs).toEqual([CONFIRM_TEMPLATES]);
        expect(cancelled.stayed).toBe(true);
        expect(cancelled.posts).toEqual([]);
        expect(await admin.mainText()).toBe(page);
    });

    test.describe('the job lists, one worker in order', () => {
        test.describe.configure({mode: 'default'});

        test('S5: the queued jobs', async ({asUser, ojsApi}) => {
            const job = await ojsApi.createJob({state: 'queued'});
            const ap = await signedIn(asUser, 'admin');
            const admin = new AdministrationPage(ap);
            const jobs = new JobsPage(ap);
            await admin.goto();

            // The Jobs page (Rule 13; Fields).
            const list = await jobs.openFromAdministration();
            await expect(jobs.heading).toHaveText('Jobs');
            await expect(jobs.table).toBeVisible();
            await expect(jobs.columns()).toHaveText(JOBS_COLUMNS);
            await expectTotal(jobs, JOBS_LINE, list.total);

            // The job's row, found by its number (Rule 13).
            const row = await jobs.findRow(job.id);
            expect(row, `job ${job.id} on the Jobs page`).not.toBeNull();
            await expect(jobs.cells(job.id)).toHaveText([String(job.id), job.displayName, job.queue, '0', CREATED_AT]);

            // The job runner Off: the job still waits after other pages (Rule 14).
            await ap.goto(`/index.php/${JOURNAL}/en`);
            await admin.goto();
            await jobs.goto();
            await jobs.reload();
            expect(await jobs.findRow(job.id), `job ${job.id} still waiting`).not.toBeNull();

            // Control: no row has a button or a link; the row is there with its cells.
            await expect(jobs.cells(job.id)).toHaveCount(5);
            await expect(jobs.row(job.id).getByRole('button')).toHaveCount(0);
            await expect(jobs.row(job.id).getByRole('link')).toHaveCount(0);
            await expect(jobs.table.locator('tbody').getByRole('button')).toHaveCount(0);
            await expect(jobs.table.locator('tbody').getByRole('link')).toHaveCount(0);
        });

        test('S6: a failed job tried again', async ({asUser, ojsApi}) => {
            const job = await ojsApi.createJob({state: 'failed'});
            const ap = await signedIn(asUser, 'admin');
            const admin = new AdministrationPage(ap);
            const jobs = new JobsPage(ap);
            const failed = new FailedJobsPage(ap);
            // The numbers already waiting, to tell the job's new one.
            await jobs.goto();
            const waiting = await jobs.allRows();
            await admin.goto();

            // The Failed Jobs page (Rule 15; Fields).
            const list = await failed.openFromAdministration();
            await expect(failed.heading).toHaveText('Failed Jobs');
            await expect(failed.table).toBeVisible();
            await expect(failed.columns()).toHaveText(FAILED_COLUMNS);
            await expectTotal(failed, FAILED_LINE, list.total);
            await expect(failed.requeueAll).toBeVisible();
            const button = await failed.requeueAll.boundingBox();
            const table = await failed.table.boundingBox();
            expect(button && table && button.y + button.height <= table.y + 1, 'the button stands above the table').toBe(true);
            expect(button && table && button.x > table.x + table.width / 2, 'at its right').toBe(true);

            // The job's row (Rule 15; Fields).
            expect(await failed.findRow(job.id), `failed job ${job.id} listed`).not.toBeNull();
            await expect(failed.cells(job.id)).toHaveText([String(job.id), job.displayName, job.queue, job.connection, FAILED_AT, /Try Again\s*Delete\s*Details/]);
            const actions = failed.cells(job.id).nth(5);
            await expect(actions.getByRole('button')).toHaveText(['Try Again', 'Delete']);
            await expect(actions.getByRole('link')).toHaveText(['Details']);
            expect(isRed(await failed.rowControl(job.id, 'Delete').evaluate((b) => getComputedStyle(b).color)), '"Delete" in red').toBe(true);
            expect(isRed(await failed.rowControl(job.id, 'Try Again').evaluate((b) => getComputedStyle(b).color)), '"Try Again" is not').toBe(false);

            // "Try Again" (Rule 16).
            const total = Number(await (await failed.totalBold()).innerText());
            const redispatch = await failed.pressAction(job.id, 'Try Again');
            expect(redispatch.status).toBe(200);
            expect(redispatch.dialogs).toEqual([]);
            await failed.expectNotice(REDISPATCHED);
            await expectTopRight(ap, failed.notice());
            await expect(failed.row(job.id)).toHaveCount(0);
            await expect(await failed.totalBold()).toHaveText(String(total - 1));

            // The Jobs page: the job again, under a new number (Rules 13, 16).
            await failed.backToAdministration();
            await jobs.openFromAdministration();
            const back = newTestJobs(waiting, await jobs.allRows(), job);
            expect(back, 'one test job put back').toHaveLength(1);
            expect(await jobs.findRow(back[0].id)).not.toBeNull();
            await expect(jobs.cells(back[0].id)).toHaveText([String(back[0].id), job.displayName, job.queue, '0', CREATED_AT]);

            // Control: "View Failed Jobs" again; no row carries the old number (Rule 16).
            await jobs.backToAdministration();
            await failed.openFromAdministration();
            expect((await failed.allRows()).map((row) => row.id)).not.toContain(job.id);
            await expect(failed.row(job.id)).toHaveCount(0);
        });

        test('S7: a failed job\'s details, then deleted', async ({asUser, ojsApi}) => {
            const job = await ojsApi.createJob({state: 'failed'});
            const ap = await signedIn(asUser, 'admin');
            const failed = new FailedJobsPage(ap);
            await failed.goto();
            expect(await failed.findRow(job.id), `failed job ${job.id} listed`).not.toBeNull();
            const failedAt = await failed.cells(job.id).nth(4).innerText();

            // "Details": the page in the same tab (Rule 18; Fields).
            const pages = ap.context().pages().length;
            const details = await failed.openDetails(job.id);
            expect(ap.context().pages()).toHaveLength(pages);
            await expect(details.trailItems).toHaveText([/^\s*Administration\b/, 'Failed Job Details']);
            await expect(details.trailLinks).toHaveText(['Administration']);
            await expect(details.titled(job.id)).toBeVisible();
            await expect(details.table.getByRole('columnheader')).toHaveText(['Attribute', 'Attribute Value']);
            await expect(details.attributes()).toHaveText(DETAILS_ROWS);
            expect((await details.value('ID')).trim()).toBe(String(job.id));
            expect((await details.value('Job')).trim()).toBe(job.displayName);
            expect((await details.value('Queue')).trim()).toBe(job.queue);
            expect((await details.value('Connection')).trim()).toBe(job.connection);
            expect((await details.value('Failed At')).trim()).toBe(failedAt.trim());
            const payload = await details.value('Payload');
            expect(payload).toContain(job.uuid);
            expect(payload.trim().split('\n').length, 'the payload over several lines').toBeGreaterThan(2);
            expect(await details.value('Exception')).toContain('Test failure job');
            // No box, no button; the trail's link is the way out (positive control).
            await expect(details.main.getByRole('button')).toHaveCount(0);
            await expect(details.main.getByRole('textbox')).toHaveCount(0);
            await expect(details.trailLink('Administration')).toBeVisible();
            await expect(details.editorialHeader).toBeVisible();
            const address = new URL(ap.url()).pathname;

            // "Delete": nothing asks; the notice, the row gone, the total less one (Rule 17; A3).
            await details.backToAdministration();
            await failed.openFromAdministration();
            expect(await failed.findRow(job.id)).not.toBeNull();
            const total = Number(await (await failed.totalBold()).innerText());
            const removed = await failed.pressAction(job.id, 'Delete');
            expect(removed.status).toBe(200);
            expect(removed.dialogs).toEqual([]);
            await failed.expectNotice(DELETED);
            await expectTopRight(ap, failed.notice());
            await expect(failed.row(job.id)).toHaveCount(0);
            await expect(await failed.totalBold()).toHaveText(String(total - 1));

            // The details address again: a bare "404 Not Found" (Rule 18).
            const gone = await ap.goto(address);
            expect(gone && gone.status()).toBe(404);
            await expect(ap.locator('body')).toHaveText(/^\s*404 Not Found\s*$/);
            await expect(ap.locator('header')).toHaveCount(0);
            await expect(ap.locator('a')).toHaveCount(0);

            // Control: the Failed Jobs page reloaded; no row carries the number (Rule 17).
            await failed.goto();
            expect((await failed.allRows()).map((row) => row.id)).not.toContain(job.id);
            await expect(failed.row(job.id)).toHaveCount(0);
        });
    });

    test('S8: "Requeue All Failed Jobs" @solo', async ({asUser, ojsApi}) => {
        const first = await ojsApi.createJob({state: 'failed'});
        const second = await ojsApi.createJob({state: 'failed'});
        const ap = await signedIn(asUser, 'admin');
        const jobs = new JobsPage(ap);
        const failed = new FailedJobsPage(ap);
        await jobs.goto();
        const waiting = await jobs.allRows();
        await failed.goto();
        expect(await failed.findRow(first.id), `failed job ${first.id} listed`).not.toBeNull();
        expect(await failed.findRow(second.id), `failed job ${second.id} listed`).not.toBeNull();
        // Every failed test job of the fleet goes back with the two.
        const testJobs = (await failed.allRows()).filter((row) => row.queue === first.queue && row.displayName === first.displayName);
        expect(testJobs.length).toBeGreaterThanOrEqual(2);
        await expect(failed.requeueAll).toBeVisible();

        // The button: the notice, the table reloaded empty (Rules 15, 19).
        const requeued = await failed.pressRequeueAll();
        expect(requeued.status).toBe(200);
        expect(requeued.dialogs).toEqual([]);
        await failed.expectNotice(REQUEUED);
        await expectTopRight(ap, failed.notice());
        await expect(failed.noItems).toBeVisible();
        await expect(failed.bodyRows).toHaveCount(1);
        await expectTotal(failed, FAILED_LINE, 0);
        await expect(failed.requeueAll).toHaveCount(0);

        // The Jobs page: both back, each under a new number (Rules 16, 19).
        await failed.backToAdministration();
        await jobs.openFromAdministration();
        const back = newTestJobs(waiting, await jobs.allRows(), first);
        expect(back, 'every failed test job put back').toHaveLength(testJobs.length);
        for (const row of back) {
            expect(row.attempts).toBe(0);
        }
        for (const row of back.slice(0, 2)) {
            expect(await jobs.findRow(row.id)).not.toBeNull();
            await expect(jobs.cells(row.id)).toHaveText([String(row.id), first.displayName, first.queue, '0', CREATED_AT]);
        }

        // Control: "View Failed Jobs" again: still empty, no button (Rule 15).
        await jobs.backToAdministration();
        await failed.openFromAdministration();
        await expect(failed.noItems).toBeVisible();
        await expectTotal(failed, FAILED_LINE, 0);
        await expect(failed.heading).toHaveText('Failed Jobs');
        await expect(failed.requeueAll).toHaveCount(0);
    });

    test('S9: a routine task\'s report and its log @solo', async ({asUser, ojsApi, pkpMail, newVisitor}) => {
        test.slow();
        const run = await ojsApi.runTask({result: 'error'});
        const vp = await newVisitor();

        // The report email (Rule 22).
        const message = await pkpMail.find({to: CONTACT.Address, subject: run.processId});
        expect(message.Subject).toBe(`${TASK_NAME} - ${run.processId} - Error`);
        expect(message.From).toMatchObject(CONTACT);
        expect(message.To).toHaveLength(1);
        expect(message.To[0]).toMatchObject(CONTACT);
        const full = await pkpMail.fullMessage(message.ID);
        const body = flat(full.Text);
        const found = body.match(REPORT_BODY);
        expect(found, `the body reads as Rule 22: ${body}`).not.toBeNull();
        const link = found ? found[1] : '';
        expect(link).toMatch(/\/index\.php\/index\/en\/admin\/downloadScheduledTaskLogFile\?file=/);
        expect(decodeURIComponent(link)).toContain(run.logFile);

        // The log link: the run's log downloads (Rule 23).
        const log = await downloadLog(await signedIn(asUser, 'admin'), link);
        expect(log).toContain('Task process started.');
        expect(log).toContain('Task process stopped.');

        // "Delete Task Logs", "Cancel": the link downloads again (Rule 12).
        const ap = await signedIn(asUser, 'admin');
        const admin = new AdministrationPage(ap);
        await admin.goto();
        const page = await admin.mainText();
        const cancelled = await admin.pressAndCancel('Delete Task Logs');
        expect(cancelled.dialogs).toEqual([CONFIRM_TASK_LOGS]);
        expect(cancelled.stayed).toBe(true);
        expect(cancelled.posts).toEqual([]);
        expect(await downloadLog(await signedIn(asUser, 'admin'), link)).toBe(log);

        // "Delete Task Logs", "OK": Administration again, no message (Rule 12; A2).
        const deleted = await admin.press('Delete Task Logs');
        expect(deleted.dialogs).toEqual([CONFIRM_TASK_LOGS]);
        expect(deleted.status).toBe(200);
        await expect(ap).toHaveURL(/\/index\.php\/index\/[a-z_A-Z]+\/admin(\/index)?$/);
        expect(await admin.mainText()).toBe(page);
        await expect(ap.locator('.pkpNotification')).toHaveCount(0);

        // The log link after: an empty page, nothing downloads (Rules 12, 23).
        const after = await signedIn(asUser, 'admin');
        const downloads = [];
        after.on('download', (download) => downloads.push(download.suggestedFilename()));
        const emptied = await after.goto(link);
        expect(emptied && emptied.status()).toBe(200);
        await expect(after.locator('body')).toHaveText('');
        expect(downloads).toEqual([]);

        // Control: the visitor at the link: the Login page (Actors row 8).
        await vp.goto(link);
        await expectLoginPage(vp);
    });
});
