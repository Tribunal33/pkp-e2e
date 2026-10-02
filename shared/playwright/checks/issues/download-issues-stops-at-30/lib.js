// Helpers of walk.js (issue report docs/issues/U64-OJS4-download-issues-stops-at-30.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses, except
// `nextDay()`, which stands in for the night the Steps wait out (see its comment).
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {idle, drainJobs, sql} = require('../../../probe');
const {filesDir} = require('../book-file-open-download-fails/lib');
const {createIssue} = require('../export-issues-list-no-order/lib');
const {publishIssue} = require('../unpublish-back-issue-clears-current/lib');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

function issuesAdmin(page, contextPath) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    return new IssuesAdmin(page, contextPath);
}

/**
 * Issues › "Future Issues" › "Create Issue" once per entry of `specs` ({volume, number, year,
 * title}), then each new row's "Publish Issue" with the email box unticked. Returns the names
 * the "Future Issues" list gave the new issues and how many were published.
 */
async function createAndPublishIssues(page, contextPath, specs, mark) {
    const issues = issuesAdmin(page, contextPath);
    const saves = [];
    for (const spec of specs) saves.push(await createIssue(issues, spec));
    await issues.goto('Future Issues');
    const names = (await issues.names('Future Issues').allInnerTexts()).map((s) => flat(s, 120)).filter((n) => n.includes(mark));
    let published = 0;
    for (const name of names) {
        await publishIssue(page, contextPath, name);
        published++;
    }
    return {saves: [...new Set(saves)], created: names.length, first: names[0], last: names[names.length - 1], published};
}

/** The reader's "Archives", every page of it: each issue's title and address, in order. */
async function archiveIssues(page, app) {
    const out = [];
    let url = app.url(`/index.php/${app.contextPath}/en/issue/archive`);
    for (let n = 0; url && n < 10; n++) {
        await page.goto(url);
        await idle(page).catch(() => {});
        out.push(...(await page.locator('.obj_issue_summary a.title').evaluateAll((as) => as.map((a) => ({title: a.textContent.replace(/\s+/g, ' ').trim(), href: a.href})))));
        url = await page.locator('.cmp_pagination a.next').first().getAttribute('href').catch(() => null);
    }
    return out;
}

/**
 * Open each issue's page once, as the reader who pressed its title on "Archives". With
 * `userAgent`, the reader's browser is a fresh window that names itself so: stable-3_5_0's list
 * of robots holds "HeadlessChrome", the name the kit's browser gives, and the loader drops a
 * robot's visits (main's list no longer holds it).
 */
async function visitIssues(page, list, {userAgent} = {}) {
    const context = userAgent ? await page.context().browser().newContext({userAgent}) : null;
    const reader = context ? await context.newPage() : page;
    const statuses = {};
    for (const {href} of list) {
        const r = await reader.goto(href);
        await idle(reader).catch(() => {});
        const s = r ? r.status() : 0;
        statuses[s] = (statuses[s] || 0) + 1;
    }
    if (context) await context.close();
    return statuses;
}

/**
 * Run the fleet's queued jobs to the end. main: the kit's `drainJobs()`. A stable line: the
 * app's `jobs.php run` until the `jobs` table is empty, because 3.5's `jobs.php work` does not
 * take the kit's `--stop-when-empty` and never ends.
 */
async function runJobs(app, config) {
    if (app.line === 'main') return drainJobs(app).then((r) => ({passes: r.passes, counts: r.counts}));
    let runs = 0;
    for (; runs < 60 && Number(sql(app, 'select count(*) from jobs')) > 0; runs++) {
        execFileSync('php', ['lib/pkp/tools/jobs.php', 'run'], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: config}, encoding: 'utf8', timeout: 120_000});
    }
    return {runs, left: sql(app, 'select count(*) from jobs'), failed: sql(app, 'select count(*) from failed_jobs')};
}

/**
 * The night between the visits and the Statistics page. The Steps say "the next day": the app's
 * daily task (`APP\tasks\UsageStatsLoader`) turns a day's log into figures the day after, and
 * the Statistics pages end their ranges at yesterday. A walk cannot wait, so this moves the
 * lines the app itself logged for the visits one day back (each line's `time`, nothing else),
 * hands the file to the loader's own stage folder under the name the app gave it, and runs the
 * app's own task and job queue on it:
 *   php lib/pkp/tools/scheduler.php test --name=APP\tasks\UsageStatsLoader
 *   php lib/pkp/tools/jobs.php work --stop-when-empty   (a stable line: `jobs.php run` until the queue is empty)
 * Returns the files and lines handed over and the `metrics_issue` rows the app compiled.
 */
async function nextDay(app) {
    const dir = path.join(filesDir(app), 'usageStats');
    const logs = path.join(dir, 'usageEventLogs');
    const stage = path.join(dir, 'stage');
    fs.mkdirSync(stage, {recursive: true});
    const back = (t) => new Date(new Date(`${t.replace(' ', 'T')}Z`).getTime() - 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
    const out = {files: [], lines: 0, issueLines: 0};
    for (const f of fs.existsSync(logs) ? fs.readdirSync(logs).filter((n) => n.endsWith('.log')) : []) {
        const lines = fs.readFileSync(path.join(logs, f), 'utf8').split('\n').filter(Boolean);
        const moved = lines.map((l) => l.replace(/"time":"(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)"/, (_, t) => `"time":"${back(t)}"`));
        fs.writeFileSync(path.join(stage, f), moved.join('\n') + '\n');
        fs.unlinkSync(path.join(logs, f));
        out.files.push(f);
        out.lines += lines.length;
        out.issueLines += lines.filter((l) => /"issueId":\d+/.test(l) && !/"submissionId":\d+/.test(l)).length;
    }
    const repo = path.join(__dirname, '../../../../..');
    const config = path.isAbsolute(app.configFile) ? app.configFile : path.join(repo, app.configFile);
    try {
        out.loader = flat(execFileSync('php', ['lib/pkp/tools/scheduler.php', 'test', '--name=APP\\tasks\\UsageStatsLoader'], {
            cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: config}, encoding: 'utf8', timeout: 120_000,
        }), 200);
    } catch (e) {
        out.loaderError = flat(`${e.message} ${e.stdout || ''} ${e.stderr || ''}`, 500);
    }
    out.jobs = await runJobs(app, config).catch((e) => ({error: flat(e.message, 300)}));
    out.metricsIssue = sql(app, 'select count(distinct issue_id), count(*), min(date), max(date), sum(metric) from metrics_issue');
    out.left = Object.fromEntries(['stage', 'processing', 'dispatch', 'reject', 'archive'].map((d) => [d, fs.existsSync(path.join(dir, d)) ? fs.readdirSync(path.join(dir, d)) : null]));
    return out;
}

/** Statistics › "Issues" as it stands: the range, the count line, the page numbers and each row's text. */
async function readIssuesTable(stats) {
    await sleep(600);
    return {
        range: flat(await stats.range.innerText().catch(() => null), 80),
        countLine: flat(await stats.itemsOfTotal.innerText().catch(() => null), 80),
        pages: (await stats.pagination.locator('.pkpPagination__page').allInnerTexts().catch(() => [])).map((s) => flat(s, 10)),
        rows: (await stats.itemRows.allInnerTexts().catch(() => [])).map((s) => flat(s, 120)),
    };
}

/**
 * A downloaded statistics file: the parameter lines the window adds, the column names and the
 * lines under them (one per issue in "Download Issues").
 */
function readFile(file) {
    const lines = file.text.replace(/^\uFEFF/, '').split(/\r?\n/);
    const gap = lines.findIndex((l) => l.trim() === '');
    const body = (gap >= 0 ? lines.slice(gap + 1) : lines).filter((l) => l.trim() !== '');
    return {name: file.name, params: gap >= 0 ? lines.slice(0, gap) : [], columns: body[0] || null, count: Math.max(body.length - 1, 0), lines: body.slice(1)};
}

/** Collect the statistics API requests from now on (address with its query, the Accept header, the status). */
function statsRequests(page) {
    const seen = [];
    const on = (r) => {
        if (!/\/api\/v1\/stats\//.test(r.url())) return;
        seen.push({url: rel(r.url()).replace(/^.*\/api\/v1/, '/api/v1'), accept: flat(r.request().headers().accept, 40), status: r.status()});
    };
    page.on('response', on);
    return {list: () => seen.slice(), clear: () => { seen.length = 0; }, stop: () => page.off('response', on)};
}

module.exports = {T, sleep, flat, rel, issuesAdmin, createAndPublishIssues, archiveIssues, visitIssues, nextDay, readIssuesTable, readFile, statsRequests};
