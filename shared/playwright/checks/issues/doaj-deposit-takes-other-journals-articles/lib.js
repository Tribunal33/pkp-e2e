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

module.exports = {T, sleep, flat, rel, createJournal, openDoaj, readSettings, saveSettings, readList, markRegistered, unpublish, publish, versioningYes, runTask, readJobsPage, readJobDetails, dbJobs};
