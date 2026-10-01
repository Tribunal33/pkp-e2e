// Issue report walk: docs/issues/U61-A4-requeue-all-failed-jobs-database-error.md
// (spec U61 register A4). A latent defect: no screen and no application path
// stores a failed job without its data, so the state is set in the database
// on two failed jobs the app's own CLI makes; then the screens:
//   1 sign in as `admin`; 2 "Administration" › "View Failed Jobs";
//   3 "Requeue All Failed Jobs".
// Preconditions the script builds (named in the report's Evidence):
//   - failed jobs A and B, each from `php lib/pkp/tools/jobs.php test
//     --only=failed` then `php lib/pkp/tools/jobs.php run --test` (lib/pkp's
//     test job on the `queuedTestJob` queue, which the in-request job runner
//     never takes);
//   - SQL `UPDATE failed_jobs SET payload = '' WHERE id IN (A, B)`.
// Neighbours (must read the same with the fix in and out):
//   - "Try Again" on A is refused with "The failed job missing the payload to
//     be redispatched." (406);
//   - a third failed job C, with its data: "Requeue All Failed Jobs" requeues
//     C (200, a new waiting job on `queuedTestJob`) and leaves A and B.
// Reach (the operator's CLI, the same repository method):
//   - `jobs.php failed --redispatch` with only A and B on the list;
//   - `jobs.php failed --redispatch --queue=u61w55none` (no failed job there).
// Each press records the request's status and body, the "Error" window, the
// rows after it, and what the database holds.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w55 --dataset 2 --reset
//   PROBE_FEATURE=issues-w55 PROBE_AGENT=w55 node bin/probe.js all shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/walk.js
//   PATH=… PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w55-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w55-3_5 PROBE_AGENT=w55 node bin/probe.js all shared/playwright/checks/issues/requeue-all-failed-jobs-database-error/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs omp ops), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w55/facts[-<run>]-<app>.json
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const flat = (s, n = 1200) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {line: app.line || 'main', baseURL: app.baseURL, db: app.db};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const cli = (args) => {
        try {
            return {exit: 0, out: flat(execFileSync('php', ['lib/pkp/tools/jobs.php', ...args], {
                cwd: path.resolve(REPO, app.root), env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)},
                encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000,
            }))};
        } catch (e) {
            return {exit: e.status, out: flat(String(e.stdout || '') + ' ' + String(e.stderr || ''))};
        }
    };
    const maxFailed = () => Number(sql(app, 'select coalesce(max(id), 0) from failed_jobs'));
    const maxJob = () => Number(sql(app, 'select coalesce(max(id), 0) from jobs'));
    const makeFailedJob = () => {
        const before = maxFailed();
        const made = [cli(['test', '--only=failed']), cli(['run', '--test'])];
        const id = maxFailed();
        if (id <= before) throw new Error(`no failed job made: ${JSON.stringify(made)}`);
        return id;
    };
    const failedRows = (ids) => sql(app, `select id || ':' || length(payload) from failed_jobs where id in (${ids.join(',')}) order by id`).split('\n').filter(Boolean);
    const newJobs = (from) => sql(app, `select id || ':' || queue || ':' || length(payload) from jobs where id > ${from} order by id`).split('\n').filter(Boolean);

    let n = 0;
    const snap = async (page, name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
    };
    const rowIds = (page) => page.locator('main table tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.querySelector('td,th') || {}).innerText).map((t) => String(t || '').trim()).filter((t) => /^\d+$/.test(t)).map(Number));
    const total = async (page) => (flat(await page.locator('main').innerText().catch(() => ''), 4000).match(/There's a total of \S+ failed job\(s\)/) || [null])[0];
    const openFailedJobs = async (page) => {
        const w = page.waitForResponse((r) => /\/api\/v1\/jobs\/failed\/all/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
        await page.getByRole('link', {name: 'View Failed Jobs', exact: true}).click();
        await w;
        await idle(page);
    };
    const press = async (page, name, locator, urlRe) => {
        const w = page.waitForResponse((r) => urlRe.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await locator.click();
        const resp = await w;
        const out = resp ? {status: resp.status(), body: flat(await resp.text().catch(() => ''), 700)} : {status: null};
        const dialog = page.getByRole('dialog').last();
        const notice = page.locator('.pkpNotification').last();
        await Promise.race([dialog.waitFor({timeout: 8000}), notice.waitFor({timeout: 8000})]).catch(() => {});
        out.dialog = await dialog.isVisible().catch(() => false) ? flat(await dialog.innerText().catch(() => ''), 900) : null;
        out.notice = await notice.isVisible().catch(() => false) ? flat(await notice.innerText().catch(() => ''), 300) : null;
        await snap(page, name);
        if (out.dialog) await dialog.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        await idle(page).catch(() => {});
        return out;
    };
    const adminPath = app.line && /3_[34]/.test(app.line) ? '/index.php/index/admin' : '/index.php/index/en/admin';

    // Preconditions: failed jobs A and B without their data.
    const A = makeFailedJob();
    const B = makeFailedJob();
    sql(app, `update failed_jobs set payload = '' where id in (${A}, ${B})`);
    fact('preconditions', {A, B, failed: failedRows([A, B]), jobsWaiting: Number(sql(app, 'select count(*) from jobs'))});

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');                                                          // 1
        await page.goto(app.url(adminPath));                                                  // 2
        await idle(page);
        await openFailedJobs(page);
        await snap(page, 'step2-failed-jobs');
        fact('step2', {url: page.url().replace(app.baseURL, ''), rows: await rowIds(page), total: await total(page)});

        const j0 = maxJob();
        const step3 = await press(page, 'step3-requeue-all',                                  // 3
            page.getByRole('button', {name: 'Requeue All Failed Jobs', exact: true}), /\/jobs\/redispatch\/all/);
        await openFailedJobs(page).catch(() => {});
        fact('step3', {...step3, rowsAfterReload: await rowIds(page), failedInDb: failedRows([A, B]), newJobs: newJobs(j0)});
        await snap(page, 'step3-after');

        // Neighbour 1: "Try Again" on A stays refused.
        await page.goto(app.url(adminPath));
        await idle(page);
        await openFailedJobs(page);
        const rowA = page.locator('main table tbody tr').filter({has: page.locator('td').first().filter({hasText: new RegExp(`^\\s*${A}\\s*$`)})});
        fact('neighbour-try-again-A', await press(page, 'neighbour-try-again-A',
            rowA.getByRole('button', {name: 'Try Again', exact: true}), new RegExp(`/jobs/redispatch/${A}$`)));

        // Neighbour 2: with a failed job C that has its data, Requeue All takes C only.
        const C = makeFailedJob();
        await page.goto(app.url(adminPath));
        await idle(page);
        await openFailedJobs(page);
        const rowsBefore = await rowIds(page);
        const j1 = maxJob();
        const mixed = await press(page, 'neighbour-requeue-mixed',
            page.getByRole('button', {name: 'Requeue All Failed Jobs', exact: true}), /\/jobs\/redispatch\/all/);
        await page.goto(app.url(adminPath));
        await idle(page);
        await openFailedJobs(page);
        fact('neighbour-requeue-mixed', {C, rowsBefore, ...mixed, rowsAfter: await rowIds(page), failedInDb: failedRows([A, B, C]), newJobs: newJobs(j1)});
    } finally {
        // Reach: the operator's CLI, through the same repository method.
        const j2 = maxJob();
        facts.cliRedispatchAll = {...cli(['failed', '--redispatch']), failedInDb: failedRows([A, B]), newJobs: newJobs(j2)};
        console.log(`[${app.name}] cliRedispatchAll: ${JSON.stringify(facts.cliRedispatchAll).slice(0, 900)}`);
        facts.cliRedispatchEmptyQueue = cli(['failed', '--redispatch', '--queue=u61w55none']);
        console.log(`[${app.name}] cliRedispatchEmptyQueue: ${JSON.stringify(facts.cliRedispatchEmptyQueue).slice(0, 900)}`);
        record('facts', facts);
        await close();
    }
});
