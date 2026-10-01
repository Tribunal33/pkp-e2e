// Helpers for the Failed Jobs walks (U61). Requiring this file runs nothing.
const path = require('path');
const {execFileSync} = require('child_process');
const {sql} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const flat = (s, n = 1200) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// The app's own jobs CLI (lib/pkp/tools/jobs.php) against the fleet's config.
function jobsCli(app, args) {
    try {
        return {exit: 0, out: flat(execFileSync('php', ['lib/pkp/tools/jobs.php', ...args], {
            cwd: path.resolve(REPO, app.root), env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)},
            encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000,
        }))};
    } catch (e) {
        return {exit: e.status, out: flat(String(e.stdout || '') + ' ' + String(e.stderr || ''))};
    }
}

// n failed jobs, as an operator makes them: `test --only=failed` n times, then
// `run --test` once (lib/pkp's TestJobFailure on the `queuedTestJob` queue,
// which the in-request job runner never takes). Returns the new failed job ids.
function makeFailedJobs(app, n) {
    const before = Number(sql(app, 'select coalesce(max(id), 0) from failed_jobs'));
    for (let i = 0; i < n; i++) {
        const r = jobsCli(app, ['test', '--only=failed']);
        if (r.exit !== 0) throw new Error(`jobs.php test failed: ${r.out}`);
    }
    const run = jobsCli(app, ['run', '--test']);
    const ids = sql(app, `select id from failed_jobs where id > ${before} order by id`).split('\n').filter(Boolean).map(Number);
    if (ids.length !== n) throw new Error(`made ${ids.length} failed jobs, wanted ${n}: ${run.out}`);
    return ids;
}

// The loading circles (ui-library Spinner, `.pkpSpinner`) shown on the page,
// each with where it sits (the pager's carries `pkpPagination__loading`).
function spinners(page) {
    return page.locator('.pkpSpinner').evaluateAll((els) => els
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; })
        .map((el) => (el.classList.contains('pkpPagination__loading') ? 'pager' : (el.closest('.pkpTable, table, [class*="Table"]') ? 'table-top' : (el.parentElement && el.parentElement.className) || 'other'))));
}

module.exports = {jobsCli, makeFailedJobs, spinners, flat};
