// Issue report walk: docs/issues/U61-A6-requeue-all-refused-spinner-keeps-turning.md
// (spec U61 register A6). Administration › "View Failed Jobs" in two tabs;
// the list is emptied in the second, then "Requeue All Failed Jobs" in the
// first is refused, and after "OK" a loading circle keeps turning.
// Preconditions (the app's own CLI, lib.js makeFailedJobs(): `jobs.php test
// --only=failed` n times, then `jobs.php run --test`):
//   A  one failed job:  1 sign in as `admin`; 2 "View Failed Jobs" (tab 1);
//      3 the same page in tab 2; 4 tab 2 "Delete" on the row; 5 tab 1
//      "Requeue All Failed Jobs"; 6 "OK" on the "Error" window.
//   B  51 failed jobs (page links under the table): tab 1 and tab 2 opened
//      afresh; tab 2 "Requeue All Failed Jobs"; tab 1 "Requeue All Failed
//      Jobs"; "OK".
//   C  reach (register A4's path): two more failed jobs whose stored data is
//      emptied in the database (SQL, no screen makes one); tab 1 "Requeue
//      All Failed Jobs" answers 500; "OK".
// Each refusal reads the loading circles 1 s and 6 s after "OK", then after
// a reload.
// Neighbours (the same with the fix in and out): in B, before tab 2's press,
// tab 1's page links "2" then "1" (rows of page 2, then page 1, no circle once
// loaded); tab 2's successful "Requeue All" (the notice, "No Items").
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w56 --dataset 1 --reset
//   PROBE_FEATURE=issues-w56 PROBE_AGENT=w56 node bin/probe.js all shared/playwright/checks/issues/requeue-all-refused-spinner-keeps-turning/walk.js
//   PATH=… PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w56-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w56-3_5 PROBE_AGENT=w56 node bin/probe.js all shared/playwright/checks/issues/requeue-all-refused-spinner-keeps-turning/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs omp ops), run with PROBE_RUN=fix.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const {jobsCli, makeFailedJobs, spinners, flat} = require('./lib');
// WALK_PHASES=C runs the reach part alone (on a fleet whose list is empty).
const PHASES = (process.env.WALK_PHASES || 'A,B,C').split(',');

const T = 30_000;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {line: app.line || 'main', baseURL: app.baseURL, db: app.db};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const adminPath = '/index.php/index/en/admin';

    let n = 0;
    const snap = async (page, name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
    };
    const listed = async (page) => ({
        rows: await page.locator('main table tbody tr').count(),
        noItems: await page.getByText('No Items', {exact: true}).isVisible().catch(() => false),
        total: (flat(await page.locator('main').innerText().catch(() => ''), 4000).match(/There's a total of \S+ failed job\(s\)/) || [null])[0],
        requeueButton: await page.getByRole('button', {name: 'Requeue All Failed Jobs', exact: true}).isVisible().catch(() => false),
        spinners: await spinners(page),
    });
    const waitList = (page) => page.waitForResponse((r) => /\/api\/v1\/jobs\/failed\/all/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
    const openFailedJobs = async (page) => {
        await page.goto(app.url(adminPath));
        await idle(page);
        const w = waitList(page);
        await page.getByRole('link', {name: 'View Failed Jobs', exact: true}).click();
        await w;
        await idle(page);
    };
    const reload = async (page) => {
        const w = waitList(page);
        await page.reload();
        await w;
        await idle(page);
    };
    // Press a control that posts to the jobs API; record the answer, the
    // window or notice it brings, then "OK" and the circles after it.
    const press = async (page, name, locator) => {
        const w = page.waitForResponse((r) => /\/api\/v1\/jobs\//.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await locator.click();
        const resp = await w;
        const out = resp ? {status: resp.status(), body: flat(await resp.text().catch(() => ''), 400)} : {status: null};
        const dialog = page.getByRole('dialog').last();
        const notice = page.locator('.pkpNotification').last();
        await Promise.race([dialog.waitFor({timeout: 8000}), notice.waitFor({timeout: 8000})]).catch(() => {});
        out.dialog = await dialog.isVisible().catch(() => false) ? flat(await dialog.innerText().catch(() => ''), 400) : null;
        out.notice = await notice.isVisible().catch(() => false) ? flat(await notice.innerText().catch(() => ''), 300) : null;
        await snap(page, `${name}-answer`);
        if (out.dialog) {
            await dialog.getByRole('button', {name: 'OK', exact: true}).click();
            await dialog.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
            await page.waitForTimeout(1000);
            out.after1s = await listed(page);
            await page.waitForTimeout(5000);
            out.after6s = await listed(page);
            await snap(page, `${name}-after-ok`);
        } else {
            await idle(page);
            out.after = await listed(page);
            await snap(page, `${name}-after`);
        }
        return out;
    };
    const requeueAll = (page) => page.getByRole('button', {name: 'Requeue All Failed Jobs', exact: true});

    const {page: tab1, close} = await launch(app);
    try {
        await signIn(tab1, 'admin');                                                          // 1
        const tab2 = await tab1.context().newPage();
        if (PHASES.includes('A')) {
        // A: one failed job, deleted in tab 2.
        const a = makeFailedJobs(app, 1);
        await openFailedJobs(tab1);                                                           // 2
        fact('A-step2-tab1', {failedJobs: a, ...await listed(tab1)});
        await snap(tab1, 'A-step2-tab1');
        await openFailedJobs(tab2);                                                           // 3
        fact('A-step4-tab2-delete', await press(tab2, 'A-step4-tab2-delete',                   // 4
            tab2.locator('main table tbody tr').first().getByRole('button', {name: 'Delete', exact: true})));
        await tab1.bringToFront();
        fact('A-step5-tab1-requeue-all', await press(tab1, 'A-step5-tab1-requeue-all', requeueAll(tab1)));   // 5, 6
        await reload(tab1);
        fact('A-tab1-after-reload', await listed(tab1));

        }
        if (PHASES.includes('B')) {
        // B: 51 failed jobs, page links under the table.
        const b = makeFailedJobs(app, 51);
        await tab1.bringToFront();
        await openFailedJobs(tab1);
        fact('B-tab1', {failedJobs: b.length, failedInDb: Number(sql(app, 'select count(*) from failed_jobs')), ...await listed(tab1)});
        await snap(tab1, 'B-tab1');
        // Neighbour: the page links still show their circle only while loading.
        for (const p of ['2', '1']) {
            const w = waitList(tab1);
            await tab1.locator('.pkpPagination__page', {hasText: new RegExp(`^\\s*${p}\\s*$`)}).click();
            await w;
            await idle(tab1);
            fact(`B-neighbour-page-${p}`, await listed(tab1));
        }
        await tab2.bringToFront();
        await openFailedJobs(tab2);
        fact('B-neighbour-tab2-requeue-all', await press(tab2, 'B-tab2-requeue-all', requeueAll(tab2)));
        fact('B-jobs-requeued', Number(sql(app, "select count(*) from jobs where queue = 'queuedTestJob'")));
        await tab1.bringToFront();
        fact('B-tab1-requeue-all', await press(tab1, 'B-tab1-requeue-all', requeueAll(tab1)));
        await reload(tab1);
        fact('B-tab1-after-reload', await listed(tab1));

        }
        if (PHASES.includes('C')) {
        // C (reach): register A4's path, two failed jobs without stored data.
        // B's 51 requeued test jobs wait on `queuedTestJob`; the CLI's purge
        // clears them so `run --test` fails only the two new ones.
        // `failed --clear` empties a list a part run left (a no-op after B).
        fact('C-purge', [jobsCli(app, ['purge', '--queue=queuedTestJob']), jobsCli(app, ['failed', '--clear'])]);
        const c = makeFailedJobs(app, 2);
        sql(app, `update failed_jobs set payload = '' where id in (${c.join(',')})`);
        await tab1.bringToFront();
        await openFailedJobs(tab1);
        fact('C-tab1', {failedJobs: c, ...await listed(tab1)});
        fact('C-tab1-requeue-all', await press(tab1, 'C-tab1-requeue-all', requeueAll(tab1)));
        await reload(tab1);
        fact('C-tab1-after-reload', await listed(tab1));
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
