// Helpers for the U61 A4 walk (requeue-all-failed-jobs-database-error).
// Requiring this file runs nothing.
const {execFileSync} = require('child_process');
const {sql} = require('../../../probe');

/**
 * Run the application's own jobs tool, `php lib/pkp/tools/jobs.php <args>`,
 * under the fleet's config. Never throws: a failing command returns its
 * output prefixed with `EXIT <code>:`.
 */
function jobsTool(app, args) {
    try {
        return execFileSync('php', ['lib/pkp/tools/jobs.php', ...args], {
            cwd: app.root,
            env: {...process.env, PKP_CONFIG_FILE: app.configFile},
            encoding: 'utf8',
            timeout: 120_000,
            stdio: ['ignore', 'pipe', 'pipe'],
        }).replace(/\s+/g, ' ').trim();
    } catch (e) {
        return `EXIT ${e.status}: ${`${e.stdout || ''}${e.stderr || ''}`.replace(/\s+/g, ' ').trim().slice(0, 400)}`;
    }
}

/**
 * Make `n` failed jobs the way an administrator tests the queue: the
 * tool's TestJobFailure dispatched `n` times on its test queue, then the
 * test queue run once, so each fails and is recorded on the failed list
 * with its stored data. Returns the new failed jobs' ids.
 */
function makeFailedJobs(app, n) {
    const before = Number(sql(app, 'select coalesce(max(id), 0) from failed_jobs'));
    const out = [];
    for (let i = 0; i < n; i++) out.push(jobsTool(app, ['test', '--only=failed']));
    out.push(jobsTool(app, ['run', '--test']));
    const ids = sql(app, `select id from failed_jobs where id > ${before} order by id`).split('\n').filter(Boolean).map(Number);
    if (ids.length !== n) throw new Error(`expected ${n} new failed jobs, found ${ids.length}: ${out.join(' / ')}`);
    return ids;
}

/** The job tables in a line: failed jobs (with/without data) and queued jobs. */
function jobCounts(app) {
    const [withData, without] = sql(app, "select count(*) filter (where payload <> ''), count(*) filter (where payload = '') from failed_jobs").split('|').map(Number);
    return {failedWithData: withData, failedWithout: without, queued: Number(sql(app, 'select count(*) from jobs'))};
}

/**
 * From Administration, "View Failed Jobs", then "Requeue All Failed Jobs".
 * Returns the page's total line before, the request's status, the start
 * of its message (the database's text is cut after its first clause), the
 * "Error" window's title and first line (then "OK" is pressed) or the
 * success notice, and the rows left after.
 */
async function requeueAllFromAdministration(page, app, {screen, record, idle}, tagName) {
    const flat = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
    await page.goto(app.url('/index.php/index/en/admin'));
    await idle(page);
    const listed = page.waitForResponse((r) => /\/api\/v1\/jobs\/failed\/all/.test(r.url()), {timeout: 20_000});
    await page.getByRole('link', {name: 'View Failed Jobs', exact: true}).click();
    await listed;
    await idle(page);
    const table = page.getByRole('table', {name: 'View Failed Jobs', exact: true});
    await table.locator('tbody tr').first().waitFor({timeout: 20_000});
    record(`${tagName}-1-failed-jobs`, await screen(page));
    const totalLine = flat(await page.locator('main').getByText(/There's a total of/).first().innerText(), 200);
    const rowsBefore = await table.locator('tbody tr').count();

    const answered = page.waitForResponse((r) => /\/api\/v1\/jobs\/redispatch\/all/.test(r.url()), {timeout: 20_000});
    const reloaded = page.waitForResponse((r) => /\/api\/v1\/jobs\/failed\/all/.test(r.url()), {timeout: 20_000}).catch(() => null);
    await page.getByRole('button', {name: 'Requeue All Failed Jobs', exact: true}).click();
    const response = await answered;
    const body = await response.json().catch(() => ({}));
    const result = {
        totalLine,
        rowsBefore,
        status: response.status(),
        answer: flat(body.message || body.errorMessage || body.error, 110),
    };
    const dialog = page.getByRole('dialog', {name: 'Error'});
    const notice = page.locator('.pkpNotification');
    await Promise.race([
        dialog.waitFor({timeout: 10_000}).catch(() => {}),
        notice.first().waitFor({timeout: 10_000}).catch(() => {}),
    ]);
    if (await dialog.count()) {
        result.window = {title: 'Error', firstLine: flat(await dialog.innerText(), 110)};
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await dialog.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    }
    if (await notice.count()) result.notice = flat(await notice.first().innerText(), 200);
    if (response.ok()) await reloaded;
    await idle(page);
    record(`${tagName}-2-after-requeue-all`, await screen(page));
    result.rowsAfter = await table.locator('tbody tr').filter({hasNot: page.getByText('No Items')}).count();
    return result;
}

module.exports = {jobsTool, makeFailedJobs, jobCounts, requeueAllFromAdministration};
