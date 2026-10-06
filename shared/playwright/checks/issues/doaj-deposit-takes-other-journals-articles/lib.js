// Helpers of walk.js (issue report docs/issues/U63-A5-doaj-deposit-takes-other-journals-articles.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses, except
// runTask(), the cron command an administrator runs (the daily task has no screen), and
// dbJobs(), a read of the queue tables kept for Evidence only.
const path = require('path');
const {execFileSync} = require('child_process');
const {idle, sql} = require('../../../probe');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const LIST = '#submissionsListGridContainer .pkp_controllers_grid, #publicationsListGridContainer .pkp_controllers_grid';

/** Administration › Hosted Journals › "Create Journal", filled and saved. Returns the save's status. */
async function createJournal(page, app, {name, initials, path: urlPath, email}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'});
    await page.goto(app.url('/index.php/index/en/admin/contexts'));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, name);
    await win.type(win.contactEmail, email);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    // "Enable this journal to appear publicly on the site": a journal in use is public, and the
    // daily task reads enabled journals only.
    await win.setBox(win.enableBox, true);
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    return r.status();
}

const doajUrl = (app, ctx) => app.url(`/index.php/${ctx}/en/management/importexport/plugin/DOAJExportPlugin`);

/** The DOAJ tool page, on its "Settings" tab (or the named tab). */
async function openDoaj(page, app, ctx, tab) {
    const r = await page.goto(doajUrl(app, ctx));
    await idle(page).catch(() => {});
    await page.locator('#importExportTabs [role=tab]').first().waitFor({timeout: T});
    if (tab) {
        await page.locator('#importExportTabs [role=tab]').filter({hasText: new RegExp(`^\\s*${tab}\\s*$`)}).first().click();
        await idle(page).catch(() => {});
        await page.locator(LIST).first().locator('tbody').first().waitFor({state: 'attached', timeout: T});
        await sleep(500);
    } else {
        await page.locator('#doajSettingsForm input[name=apiKey]').waitFor({timeout: T});
    }
    return r ? r.status() : null;
}

/** The Settings tab: "DOAJ API Key" and the automatic-deposit box, as they stand. */
async function readSettings(page) {
    const f = page.locator('#doajSettingsForm');
    return {
        apiKeySet: !!(await f.locator('input[name=apiKey]').inputValue().catch(() => '')),
        automatic: await f.locator('input[name=automaticRegistration]').isChecked().catch(() => null),
        automaticLabel: flat(await f.locator('label[for^="automaticRegistration"]').first().innerText().catch(() => null), 200),
    };
}

/** Type a key, tick the automatic-deposit box, "Save". */
async function saveSettings(page, {key, auto}) {
    const f = page.locator('#doajSettingsForm');
    await f.locator('input[name=apiKey]').fill(key);
    await f.locator('input[name=automaticRegistration]').setChecked(auto);
    const w = page.waitForResponse((r) => r.request().method() === 'POST' && /DOAJExportPlugin|manage/.test(r.url()), {timeout: T}).catch(() => null);
    await f.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    await idle(page).catch(() => {});
    await sleep(500);
    return r ? r.status() : null;
}

/** The open list: its rows' cells (ID, Author; Title, Issue, Status). */
async function readList(page) {
    const g = page.locator(LIST).first();
    return g.evaluate((grid) => {
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (el) => !!(el && el.offsetParent !== null);
        return [...grid.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => [...tr.querySelectorAll('td')].map(txt).slice(1));
    });
}

/** Tick the row of a submission ID (its first column, on "Articles" and "Publications" alike) and press "Mark registered"; lands back on the page. */
async function markRegistered(page, id) {
    const row = page.locator(LIST).first().locator('tbody tr.gridRow').filter({has: page.locator('td:nth-child(2)', {hasText: new RegExp(`^\\s*${id}\\s*$`)})});
    await row.locator('input[type=checkbox]').first().check({timeout: T});
    const landed = page.waitForResponse((r) => r.request().isNavigationRequest() && r.request().method() === 'GET' && r.url().includes('DOAJExportPlugin'), {timeout: 90_000}).catch(() => null);
    await page.locator('form#exportSubmissionXmlForm button[name="markRegistered"], form#exportPublicationXmlForm button[name="markRegistered"]').first().click();
    const r = await landed;
    await idle(page).catch(() => {});
    return r ? r.status() : null;
}

const controls = (page) => page.locator('[data-cy="workflow-controls-right"]');

async function openWorkflow(page, app, ctx, sid) {
    await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${sid}`));
    await idle(page).catch(() => {});
    await controls(page).waitFor({timeout: T});
    await sleep(1500);
}

/** Workflow › "Unpublish", confirmed. Returns the request's status. */
async function unpublish(page, app, ctx, sid) {
    await openWorkflow(page, app, ctx, sid);
    await controls(page).getByRole('button', {name: 'Unpublish', exact: true}).click();
    const win = page.getByRole('dialog').filter({hasText: /Are you sure you don't want this to be/}).last();
    await win.waitFor({timeout: T});
    const w = page.waitForResponse((x) => /\/unpublish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Unpublish', exact: true}).click();
    const r = await w;
    await controls(page).getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    return r ? r.status() : null;
}

/** Workflow › "Publish", confirmed (through "Review Publishing Details" when it opens). */
async function publish(page, app, ctx, sid) {
    // Right after "Unpublish" the workflow is still open with "Publish" in its controls.
    if (!(await controls(page).isVisible().catch(() => false))) await openWorkflow(page, app, ctx, sid);
    const out = {};
    const button = controls(page).getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
    await button.waitFor({state: 'visible', timeout: T});
    out.button = flat(await button.innerText(), 60);
    await button.click();
    const pnl = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
    const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to/}).last();
    const opened = await Promise.race([
        pnl.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
        confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
    ]).catch(() => null);
    out.opened = opened;
    await idle(page).catch(() => {});
    await sleep(1500);
    if (opened === 'panel') {
        await pnl.getByRole('button', {name: 'Confirm', exact: true}).click();
        await confirm.waitFor({state: 'visible', timeout: T});
        await idle(page).catch(() => {});
        await sleep(800);
    }
    out.confirmText = flat(await confirm.innerText().catch(() => null), 300);
    const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click();
    const r = await w;
    out.status = r ? r.status() : null;
    await controls(page).getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return out;
}

/** Settings › Distribution › DOIs › Setup: DOIs on (with a prefix when none is set) and "DOI Versioning" "Yes". */
async function versioningYes(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/en/management/settings/distribution`));
    await idle(page).catch(() => {});
    await page.getByRole('tab', {name: 'DOIs', exact: true}).click();
    await idle(page).catch(() => {});
    const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
    await dois.getByRole('tab', {name: 'Setup', exact: true}).click();
    const setup = dois.getByRole('tabpanel', {name: 'Setup', exact: true});
    const enable = setup.locator('input[name="enableDois"]').first();
    await enable.waitFor({timeout: T});
    if (!(await enable.isChecked())) await enable.check();
    const prefix = setup.locator('input[name="doiPrefix"]').first();
    if ((await prefix.count()) && !(await prefix.inputValue())) await prefix.fill('10.99999');
    await setup.getByRole('radio', {name: 'Yes, assign a unique DOI to every version of an article.'}).check();
    const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await setup.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    await idle(page).catch(() => {});
    return r ? r.status() : null;
}

/** The daily DOAJ task, run now as the server's cron would run it (the line's own class name). */
function runTask(app) {
    const task = app.line === 'stable-3_5_0' ? 'APP\\plugins\\importexport\\doaj\\DOAJInfoSender' : 'APP\\plugins\\generic\\doaj\\DOAJInfoSender';
    const args = ['lib/pkp/tools/scheduler.php', 'test', `--name=${task}`];
    try {
        const out = execFileSync('php', args, {cwd: path.resolve(REPO, app.root), env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)}, encoding: 'utf8', timeout: 180_000});
        return {command: `php ${args.join(' ')}`, output: flat(out, 1500)};
    } catch (e) {
        return {command: `php ${args.join(' ')}`, error: flat(`${e.stdout || ''} ${e.stderr || ''} ${e.message}`, 1500)};
    }
}

/** Administration › "View Jobs" or "View Failed Jobs": the table's rows. */
async function readJobsPage(page, app, op) {
    await page.goto(app.url(`/index.php/index/en/admin/${op}`));
    await idle(page).catch(() => {});
    await sleep(1500);
    const rows = await page.locator('main table tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
    const details = await page.locator('main a').evaluateAll((as) => as.filter((a) => /failedJobDetails/.test(a.href)).map((a) => a.href)).catch(() => []);
    return {rows, details};
}

/** A failed job's "Details" page: its attribute rows. */
async function readJobDetails(page, href) {
    await page.goto(href);
    await idle(page).catch(() => {});
    await sleep(1000);
    return page.locator('main table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())));
}

/** Evidence only: the queue tables, each DOAJ job's context path and article link. */
function dbJobs(app) {
    const pick = (payload) => ({
        job: (payload.match(/DOAJ(Register|Delete)/) || [null])[0],
        contextPath: (payload.match(/urlPath\\?";s:\d+:\\?"([^"\\]+)/) || payload.match(/"urlPath";s:\d+:"([^"]+)"/) || [null, null])[1],
        link: (payload.match(/https?:[^"\s]*?article\\*\/view\\*\/\d+(\\*\/version\\*\/\d+)?/) || [null])[0],
    });
    const read = (table) => sql(app, `select payload from ${table} order by id`).split('\n').filter(Boolean).map(pick);
    return {jobs: read('jobs'), failedJobs: read('failed_jobs')};
}

/** Evidence only: the stored DOAJ statuses of a submission and of its publications. */
function storedStatus(app, sid) {
    return {
        submission: sql(app, `select setting_value from submission_settings where submission_id = ${sid} and setting_name = 'doaj::status'`).trim() || null,
        publications: sql(app, `select p.publication_id || ':' || p.status || ':' || coalesce(ps.setting_value, '-') from publications p left join publication_settings ps on ps.publication_id = p.publication_id and ps.setting_name = 'doaj::status' where p.submission_id = ${sid} order by p.publication_id`).split('\n').filter(Boolean),
        current: sql(app, `select current_publication_id from submissions where submission_id = ${sid}`).trim(),
    };
}

/** "Unpublish" in the header of the version page the workflow shows, confirmed. */
async function unpublishShown(page) {
    await controls(page).getByRole('button', {name: 'Unpublish', exact: true}).click({timeout: T});
    const win = page.getByRole('dialog').filter({hasText: /Are you sure you don't want this to be/}).last();
    await win.waitFor({timeout: T});
    const w = page.waitForResponse((x) => /\/unpublish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Unpublish', exact: true}).click();
    const r = await w;
    await idle(page).catch(() => {});
    await sleep(800);
    return r ? r.status() : null;
}

/**
 * Steps "Content that is not published" (one journal), main and 3.5: publicknowledge deposits
 * automatically; submission 17 marked registered, a new version retitled and left unpublished,
 * version 1 unpublished; then the daily task. Each step records what it met rather than throwing.
 */
async function walkUnpublished({app, page, t, fact, snap, statusOf, SID}) {
    const {signIn, signOut} = require('../../../probe');
    const V = require('../older-version-tab-current-title/lib');
    const {openVersionPage} = require('../jats-body-html-markup-as-text/lib');
    const marker = `Draft title ${t}, not published`;
    const step = async (name, fn) => {
        try {
            fact(name, await fn());
        } catch (e) {
            fact(name, {error: flat(e.message, 400), snap: await snap(page, 'error').catch(() => null)});
        }
    };
    await signIn(page, 'dbarnes');
    await step('1 publicknowledge DOAJ settings', async () => {
        await openDoaj(page, app, 'publicknowledge');
        const before = await readSettings(page);
        const save = await saveSettings(page, {key: 'publicknowledge-test-key', auto: true});
        await openDoaj(page, app, 'publicknowledge');
        return {before, save, after: await readSettings(page), snap: await snap(page, 'settings-saved')};
    });
    await step('2 mark registered', async () => {
        await openDoaj(page, app, 'publicknowledge', 'Articles');
        const list = await readList(page);
        const mr = await markRegistered(page, SID);
        await openDoaj(page, app, 'publicknowledge', 'Articles');
        return {before: list, status: mr, row: statusOf(await readList(page)), stored: storedStatus(app, SID), snap: await snap(page, 'marked')};
    });
    let created = null;
    await step('3 create new version', async () => {
        await openWorkflow(page, app, 'publicknowledge', SID);
        created = await V.createNewVersion(page, app);
        return {...created, snap: await snap(page, 'new-version')};
    });
    await step('4 retitle the new version', async () => {
        const r = await V.retitleVersion(page, app, SID, created && created.id, marker);
        return {...r, snap: await snap(page, 'draft-retitled')};
    });
    await step('5 unpublish version 1', async () => {
        await openWorkflow(page, app, 'publicknowledge', SID);
        const frame = V.workflowFrame(page, app);
        const at = await openVersionPage(page, app, frame, 'first', 'Title & Abstract');
        await sleep(1000);
        const status = await unpublishShown(page);
        return {at, status, stored: storedStatus(app, SID), snap: await snap(page, 'unpublished')};
    });
    await step('6 list before the task', async () => {
        await openDoaj(page, app, 'publicknowledge', 'Articles');
        const list = await readList(page);
        return {row17: statusOf(list), list, snap: await snap(page, 'before-task')};
    });
    fact('queue before the task', dbJobs(app));
    fact('7 task', runTask(app));
    fact('queue after the task', dbJobs(app));
    fact('stored after the task', storedStatus(app, SID));
    await step('8 jobs pages', async () => {
        await signIn(page, 'admin');
        const jobs = await readJobsPage(page, app, 'jobs');
        const jobsSnap = await snap(page, 'view-jobs');
        let failed = await readJobsPage(page, app, 'failedJobs');
        for (let i = 0; i < 5 && !failed.details.length; i++) failed = await readJobsPage(page, app, 'failedJobs');
        const failedSnap = await snap(page, 'view-failed-jobs');
        const details = [];
        for (const href of failed.details.slice(0, 4)) {
            const rows = await readJobDetails(page, href);
            details.push({href: rel(href), rows: rows.map(([a, v]) => [a, /payload/i.test(a || '') ? flat(v, 6000) : flat(v, 300)])});
        }
        if (details.length) await snap(page, 'failed-job-details');
        const payload = details.flatMap((d) => d.rows.map(([, v]) => v || '')).join(' ').replace(/\\/g, '');
        return {
            jobs: {...jobs, snap: jobsSnap},
            failed: {...failed, snap: failedSnap},
            details,
            markerInPayload: payload.includes(marker),
            links: [...new Set(payload.match(/https?:\/\/[^"\s]*?\/article\/view\/\d+(\/version\/\d+)?/g) || [])],
        };
    });
    await step('9 the deposited links, signed out', async () => {
        const q = dbJobs(app);
        const links = [...new Set([...q.jobs, ...q.failedJobs].map((j) => j.link).filter(Boolean).map((u) => u.replace(/\\/g, '')))];
        await signOut(page).catch(() => {});
        const visits = [];
        for (const u of links) {
            const r = await page.goto(u).catch(() => null);
            visits.push({link: rel(u), status: r ? r.status() : null, landed: rel(page.url()), h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120), snap: await snap(page, 'deposited-link')});
        }
        return visits;
    });
    fact('queue at the end', dbJobs(app));
}

module.exports = {T, sleep, flat, rel, storedStatus, unpublishShown, walkUnpublished, createJournal, openDoaj, readSettings, saveSettings, readList, markRegistered, unpublish, publish, versioningYes, runTask, readJobsPage, readJobDetails, dbJobs};
