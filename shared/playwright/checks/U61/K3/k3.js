// U61 claim check, chunk K3: Administration › "View Jobs" and "View Failed
// Jobs", a failed job's "Details", "Try Again", "Delete", "Requeue All Failed
// Jobs", the old-failed-jobs removal and the [queues] settings; all three apps.
// Spec: docs/specs/U61-system-administration.md — body 72–85, 200–262,
// 314–331, register A3/A4 (474–490); footnotes n, o, p, q, r, s, t, td6, td7,
// td8, f-a3, f-a4.
//
// Jobs are fleet-wide: every job this script makes is lib/pkp's test job on
// the `queuedTestJob` queue, made through `POST _test/scenarios/job`
// (pkpApi.createJob) or the app's own worker (`jobs.php run --test`), and
// found by id, never by position. Given states no screen makes (a job in
// progress, a job attempted before, a failed job with no stored data, a
// failed job from the default queue, failed jobs 179–181 days old) are set
// on this script's own rows in the database. The script ends with no test
// job waiting and no failed job (the fleet's state before it).
// Seeds per app (tag prefix u61k3): one scratch journal "K3 <t>" (the brief's
// scratch context; jobs belong to no journal).
// Phases (PHASES=a,b; default all): seed, empty, jobs, paging, failed,
// actions, refused, details, requeue, nopayload, stale, prune, settings,
// access, cleanup
// Run: PROBE_FEATURE=U61 PROBE_AGENT=ccK3 node bin/probe.js <app|all> shared/playwright/checks/U61/K3/k3.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} =
    require('../../../probe');

const ALL = ['seed', 'empty', 'jobs', 'paging', 'failed', 'actions', 'refused', 'details', 'requeue', 'nopayload', 'stale', 'prune', 'settings', 'access', 'cleanup'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 20_000;
const REPO = path.resolve(__dirname, '../../../../..');
const flat = (s, n = 4000) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const log = (...a) => console.log('[k3]', new Date().toISOString().slice(11, 19), ...a);
const sql = (app, q) => execFileSync('psql', ['-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const cli = (app, args) => {
    const env = {...process.env};
    for (const line of fs.readFileSync(path.resolve(REPO, app.root, '.env.playwright'), 'utf8').split('\n')) {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (m) env[m[1]] = m[2];
    }
    try {
        return flat(execFileSync('php', args, {cwd: path.resolve(REPO, app.root), env, encoding: 'utf8', timeout: 300_000}), 800);
    } catch (e) {
        return `EXIT ${e.status}: ${flat(String(e.stdout || '') + String(e.stderr || ''), 800)}`;
    }
};
const counts = (app) => ({
    jobs: sql(app, "select queue || ':' || count(*) from jobs group by queue order by 1").split('\n').filter(Boolean),
    failed: Number(sql(app, 'select count(*) from failed_jobs')),
});

let CUR = 'init';
const CRASH = {};
const DIALOGS = [];
const JOBAPI = [];
function watch(page, label = 'A') {
    page.on('response', (r) => {
        if (r.status() >= 500) (CRASH[CUR] = CRASH[CUR] || []).push(`server ${r.status()} ${r.request().method()} ${rel(r.url()).slice(0, 200)}`);
        if (/\/api\/v1\/jobs/.test(r.url())) JOBAPI.push({phase: CUR, tab: label, method: r.request().method(), override: r.request().headers()['x-http-method-override'] || '', url: rel(r.url()).slice(0, 160), status: r.status()});
    });
    page.on('pageerror', (e) => { (CRASH[CUR] = CRASH[CUR] || []).push(`script ${String(e.message || e).slice(0, 200)}`); });
    page.on('dialog', (d) => { DIALOGS.push({phase: CUR, tab: label, type: d.type(), message: d.message()}); d.type() === 'beforeunload' ? d.accept().catch(() => {}) : d.dismiss().catch(() => {}); });
    return page;
}

async function snap(page, name, extra = {}) {
    const s = await screen(page);
    record(name, {...s, ...extra});
    await shot(page, name).catch(() => {});
    return s;
}

// A jobs page landed and its list read (the page loads it once on created()).
async function openList(page, app, op, {page: n} = {}) {
    const w = page.waitForResponse((r) => /\/api\/v1\/jobs\/(all|failed\/all)/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
    const resp = await page.goto(app.url(`/index.php/index/en/admin/${op}`));
    await w;
    await idle(page);
    if (n && n > 1) await gotoPageNo(page, n);
    return resp && resp.status();
}
async function gotoPageNo(page, n) {
    const w = page.waitForResponse((r) => /\/api\/v1\/jobs\//.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
    await page.getByRole('button', {name: new RegExp(`(^|\\s)${n}$`)}).first().click();
    await w;
    await idle(page);
}
async function readTable(page) {
    return page.evaluate(() => {
        const t = document.querySelector('main table') || document.querySelector('table');
        if (!t) return null;
        const cell = (c) => c.innerText.replace(/ /g, ' ').trim();
        const head = [...t.querySelectorAll('thead th')].map(cell);
        const rows = [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td,th')].map(cell));
        const main = document.querySelector('main') || document.body;
        const bold = [...main.querySelectorAll('strong')].map((b) => b.innerText);
        return {head, rows, bold};
    });
}
const rowById = (tbl, id) => (tbl && tbl.rows.find((r) => r[0] === String(id))) || null;
const rowLoc = (page, id) => page.locator('main table tbody tr').filter({has: page.locator('td').first().filter({hasText: new RegExp(`^\\s*${id}\\s*$`)})});
const lineOf = (s) => (flat(s.text.main).match(/There's a total of \S+ (failed )?job\(s\)[^.]*?(on the queue|\.)/) || [null])[0];

async function paginationRead(page) {
    return page.evaluate(() => {
        const nav = document.querySelector('.pkpPagination, nav[aria-label*="agination" i]');
        if (!nav) return null;
        return {text: nav.innerText.replace(/\s+/g, ' ').trim(), buttons: [...nav.querySelectorAll('button,a')].map((b) => ({t: b.innerText.trim() || b.getAttribute('aria-label'), disabled: b.disabled || b.getAttribute('aria-disabled'), current: b.getAttribute('aria-current')}))};
    });
}
async function notice(page) {
    const n = page.locator('.pkpNotification').last();
    const seen = await n.waitFor({timeout: 8000}).then(() => true).catch(() => false);
    if (!seen) return null;
    const box = await n.boundingBox().catch(() => null);
    return {text: flat(await n.innerText().catch(() => '')), box, viewport: page.viewportSize()};
}
async function errorDialog(page) {
    const d = page.getByRole('dialog').last();
    const seen = await d.waitFor({timeout: 8000}).then(() => true).catch(() => false);
    if (!seen) return null;
    const out = {text: await d.innerText().catch(() => ''), buttons: await d.getByRole('button').allInnerTexts().catch(() => []), aria: await d.ariaSnapshot({timeout: 2000}).catch(() => '')};
    return out;
}
async function closeNotices(page) {
    for (const b of await page.locator('.pkpNotification').getByRole('button', {name: 'Close'}).all()) await b.click().catch(() => {});
}
async function pressRowButton(page, id, name) {
    const w = page.waitForResponse((r) => /\/api\/v1\/jobs\//.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await rowLoc(page, id).getByRole('button', {name, exact: true}).click();
    const resp = await w;
    return resp ? {status: resp.status(), url: rel(resp.url()), override: resp.request().headers()['x-http-method-override'] || '', body: flat(await resp.text().catch(() => ''), 300)} : null;
}

forEachApp(async (app) => {
    const R = {app: app.name, started: new Date().toISOString()};
    const {page, context, close} = await launch(app);
    watch(page, 'A');
    const S = {};
    const phase = async (name, fn) => {
        if (!on(name)) return;
        CUR = `${app.name}:${name}`;
        log(app.name, name);
        try {
            R[name] = await fn();
        } catch (e) {
            R[name] = {error: String(e.stack || e).slice(0, 1200)};
            await shot(page, `error-${name}`).catch(() => {});
        }
        R[name] = {...(R[name] || {}), crashes: CRASH[CUR] || []};
        record('k3', {[name]: R[name]}, {merge: true});
    };
    try {
        await phase('seed', async () => {
            const before = counts(app);
            const J = tag('u61k3');
            await app.api.createContext({tag: J, context: {name: `U61 K3 journal ${J}`, acronym: 'K3J'}});
            S.J = J;
            const after = counts(app);
            await signIn(page, 'admin');
            return {before, J, afterContext: after};
        });

        // Both ends of the list: none (the fleet's state before this script).
        await phase('empty', async () => {
            const c = counts(app);
            const out = {counts: c};
            await openList(page, app, 'jobs');
            const s1 = await snap(page, 'jobs-empty');
            out.jobs = {title: s1.title, line: lineOf(s1), table: await readTable(page), pagination: await paginationRead(page)};
            await loc(page, 'Jobs: the table', page.locator('main table'));
            await openList(page, app, 'failedJobs');
            const s2 = await snap(page, 'failed-empty');
            out.failed = {title: s2.title, line: lineOf(s2), table: await readTable(page), requeueAll: await page.getByRole('button', {name: 'Requeue All Failed Jobs'}).count()};
            return out;
        });

        // One waiting job of our own; the page does not refresh by itself; a
        // job in progress (reserved) and one attempted before.
        await phase('jobs', async () => {
            const q1 = await app.api.createJob({state: 'queued'});
            S.q1 = q1;
            const out = {q1};
            await openList(page, app, 'jobs');
            const s = await snap(page, 'jobs-one');
            const tbl = await readTable(page);
            out.page = {title: s.title, header: flat(s.text.header, 300), line: lineOf(s), head: tbl.head, row: rowById(tbl, q1.id), rowCount: tbl.rows.length, bold: tbl.bold};
            out.rowControls = await rowLoc(page, q1.id).locator('button, a, input, select').count();
            out.mainControls = await page.locator('main').getByRole('button').allInnerTexts();
            out.mainLinks = await page.locator('main').getByRole('link').allInnerTexts();
            await loc(page, 'Jobs: a row by its ID', rowLoc(page, q1.id));
            // No refresh by itself: a second job made while the page is open.
            const gets = [];
            const listen = (r) => { if (/\/api\/v1\/jobs\/all/.test(r.url())) gets.push(new Date().toISOString()); };
            page.on('request', listen);
            const q2 = await app.api.createJob({state: 'queued'});
            S.q2 = q2;
            await sleep(12_000);
            page.off('request', listen);
            const tbl2 = await readTable(page);
            out.noRefresh = {q2: q2.id, shownWithoutReload: !!rowById(tbl2, q2.id), listRequestsIn12s: gets.length, line: lineOf(await screen(page))};
            await openList(page, app, 'jobs');
            const s3 = await screen(page);
            out.afterReload = {q2Shown: !!rowById(await readTable(page), q2.id), line: lineOf(s3)};
            // In progress: q2 reserved (as a worker does while it runs it);
            // q1 attempted twice before, not reserved.
            sql(app, `update jobs set reserved_at = extract(epoch from now())::int, attempts = 1 where id = ${q2.id}`);
            sql(app, `update jobs set attempts = 2 where id = ${q1.id}`);
            await openList(page, app, 'jobs');
            const s4 = await snap(page, 'jobs-reserved');
            const tbl4 = await readTable(page);
            out.reserved = {q2Shown: !!rowById(tbl4, q2.id), line: lineOf(s4), q1row: rowById(tbl4, q1.id), dbWaiting: sql(app, "select count(*) from jobs where queue='queuedTestJob'")};
            sql(app, `update jobs set reserved_at = null, attempts = 0 where id = ${q2.id}`);
            sql(app, `update jobs set attempts = 0 where id = ${q1.id}`);
            return out;
        });

        // The other end: past 50 waiting jobs, then the app's own worker
        // fails them all (Rule 14's "fails its last attempt").
        await phase('paging', async () => {
            const made = [];
            for (let i = 0; i < 50; i++) made.push((await app.api.createJob({state: 'queued'})).id);
            S.bulk = made;
            const out = {made: made.length, dbWaiting: sql(app, "select count(*) from jobs where queue='queuedTestJob'")};
            await openList(page, app, 'jobs');
            const s = await snap(page, 'jobs-page1');
            const t1 = await readTable(page);
            out.page1 = {line: lineOf(s), rows: t1.rows.length, ids: t1.rows.map((r) => Number(r[0])), pagination: await paginationRead(page)};
            await loc(page, 'Jobs: the page links', page.locator('.pkpPagination'));
            await gotoPageNo(page, 2);
            const s2 = await snap(page, 'jobs-page2');
            const t2 = await readTable(page);
            out.page2 = {line: lineOf(s2), rows: t2.rows.length, ids: t2.rows.map((r) => Number(r[0])), pagination: await paginationRead(page)};
            out.dbOrder = sql(app, "select string_agg(id::text, ',') from (select id from jobs where queue='queuedTestJob' and reserved_at is null) x");
            // Worker outside the application: jobs.php run --test.
            const maxF = Number(sql(app, 'select coalesce(max(id),0) from failed_jobs'));
            out.worker = cli(app, ['lib/pkp/tools/jobs.php', 'run', '--test']);
            out.afterWorker = counts(app);
            S.failedIds = sql(app, `select id from failed_jobs where id > ${maxF} order by id`).split('\n').filter(Boolean).map(Number);
            out.failedIds = S.failedIds.length;
            await openList(page, app, 'jobs');
            const s3 = await snap(page, 'jobs-after-worker');
            out.jobsAfterWorker = {line: lineOf(s3), table: await readTable(page)};
            return out;
        });

        await phase('failed', async () => {
            const out = {};
            await openList(page, app, 'failedJobs');
            const s = await snap(page, 'failed-page1');
            const t = await readTable(page);
            const id = S.failedIds[0];
            out.page1 = {title: s.title, line: lineOf(s), head: t.head, rows: t.rows.length, ids: t.rows.map((r) => Number(r[0])), pagination: await paginationRead(page), sampleRow: t.rows[0], bold: t.bold};
            out.actions = t.rows.length ? await page.locator('main table tbody tr').first().locator('td').last().evaluate((td) => [...td.querySelectorAll('button,a')].map((b) => ({tag: b.tagName, text: b.innerText.trim(), cls: b.className, color: getComputedStyle(b).color, href: b.getAttribute('href')}))) : null;
            const req = page.getByRole('button', {name: 'Requeue All Failed Jobs'});
            out.requeueAll = {count: await req.count(), box: await req.first().boundingBox().catch(() => null), tableBox: await page.locator('main table').boundingBox().catch(() => null)};
            await loc(page, 'Failed Jobs: Requeue All Failed Jobs', req);
            await loc(page, 'Failed Jobs: a row by its ID', rowLoc(page, id));
            await loc(page, "Failed Jobs: a row's Try Again", rowLoc(page, id).getByRole('button', {name: 'Try Again', exact: true}));
            await loc(page, "Failed Jobs: a row's Delete", rowLoc(page, id).getByRole('button', {name: 'Delete', exact: true}));
            await loc(page, "Failed Jobs: a row's Details", rowLoc(page, id).getByRole('link', {name: 'Details'}));
            await gotoPageNo(page, 2);
            const s2 = await snap(page, 'failed-page2');
            const t2 = await readTable(page);
            out.page2 = {line: lineOf(s2), rows: t2.rows.length, ids: t2.rows.map((r) => Number(r[0])), pagination: await paginationRead(page)};
            out.dbFailedAt = sql(app, `select failed_at from failed_jobs where id = ${id}`);
            return out;
        });

        // Try Again and Delete on page-1 rows; read at once and after reload.
        await phase('actions', async () => {
            const out = {};
            await openList(page, app, 'failedJobs');
            const tbl = await readTable(page);
            const ids = tbl.rows.map((r) => Number(r[0]));
            const [a, b] = ids;
            S.tryId = a; S.delId = b;
            const maxJ = Number(sql(app, 'select coalesce(max(id),0) from jobs'));
            const payloadA = sql(app, `select md5(payload) || '|' || queue from failed_jobs where id = ${a}`);
            out.tryAgain = {id: a, resp: await pressRowButton(page, a, 'Try Again'), notice: await notice(page)};
            await sleep(300);
            const s = await snap(page, 'failed-after-tryagain');
            const t = await readTable(page);
            out.tryAgain.now = {rowShown: !!rowById(t, a), line: lineOf(s), rows: t.rows.length, pagination: await paginationRead(page)};
            await openList(page, app, 'failedJobs');
            const sr = await screen(page);
            out.tryAgain.reload = {rowShown: !!rowById(await readTable(page), a), line: lineOf(sr)};
            const newJob = sql(app, `select id || '|' || queue || '|' || attempts || '|' || md5(payload) from jobs where id > ${maxJ} order by id`);
            out.tryAgain.db = {failedPayloadQueue: payloadA, newJobs: newJob};
            const nid = Number(newJob.split('|')[0]);
            S.requeuedId = nid;
            await openList(page, app, 'jobs');
            const sj = await snap(page, 'jobs-after-tryagain');
            out.tryAgain.jobsPage = {row: rowById(await readTable(page), nid), line: lineOf(sj)};
            // Delete: no question expected.
            await openList(page, app, 'failedJobs');
            const dialogsBefore = DIALOGS.length;
            out.delete = {id: b, resp: await pressRowButton(page, b, 'Delete')};
            out.delete.notice = await notice(page);
            out.delete.browserDialogs = DIALOGS.length - dialogsBefore;
            out.delete.appDialogs = await page.getByRole('dialog').count();
            const sd = await snap(page, 'failed-after-delete');
            const td = await readTable(page);
            out.delete.now = {rowShown: !!rowById(td, b), line: lineOf(sd), rows: td.rows.length};
            await openList(page, app, 'failedJobs');
            out.delete.reload = {rowShown: !!rowById(await readTable(page), b), line: lineOf(await screen(page))};
            out.delete.db = sql(app, `select count(*) from failed_jobs where id = ${b}`) + ' failed; jobs added ' + sql(app, `select count(*) from jobs where id > ${nid}`);
            return out;
        });

        // td7: one row gone in tab A, then Try Again / Delete on it in tab B.
        await phase('refused', async () => {
            const out = {};
            const pageB = watch(await context.newPage(), 'B');
            try {
                await openList(page, app, 'failedJobs');
                await openList(pageB, app, 'failedJobs');
                const ids = (await readTable(page)).rows.map((r) => Number(r[0]));
                const [x, y] = ids;
                out.tabA = {id: x, resp: await pressRowButton(page, x, 'Delete'), notice: await notice(page)};
                out.tabB = {tryAgain: await pressRowButton(pageB, x, 'Try Again')};
                out.tabB.dialog = await errorDialog(pageB);
                const sb = await snap(pageB, 'refused-tryagain-tabB');
                out.tabB.screenDialog = sb.text.dialog;
                out.tabB.rowStays = await rowLoc(pageB, x).count();
                out.tabB.line = lineOf(sb);
                out.tabB.notice = await pageB.locator('.pkpNotification').count();
                if (out.tabB.dialog) {
                    await pageB.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click().catch((e) => { out.tabB.okError = flat(e.message, 200); });
                    await sleep(700);
                    out.tabB.afterOk = {dialogs: await pageB.getByRole('dialog').count(), rowStays: await rowLoc(pageB, x).count()};
                }
                out.tabB.delete = await pressRowButton(pageB, x, 'Delete');
                out.tabB.deleteDialog = await errorDialog(pageB);
                await snap(pageB, 'refused-delete-tabB');
                if (out.tabB.deleteDialog) await pageB.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                await sleep(700);
                out.tabB.afterDeleteOk = {rowStays: await rowLoc(pageB, x).count()};
                // The same in reverse: Try Again in A, Delete in B.
                out.reverse = {id: y, tryAgainA: await pressRowButton(page, y, 'Try Again')};
                out.reverse.deleteB = await pressRowButton(pageB, y, 'Delete');
                out.reverse.dialogB = await errorDialog(pageB);
                if (out.reverse.dialogB) await pageB.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                out.reverse.rowStaysB = await rowLoc(pageB, y).count();
            } finally {
                await pageB.close().catch(() => {});
            }
            return out;
        });

        // td8: Details by the row's link (same tab?), its page, its way out,
        // then the same address after the job is deleted; odd addresses.
        await phase('details', async () => {
            const out = {};
            await openList(page, app, 'failedJobs');
            const id = (await readTable(page)).rows.map((r) => Number(r[0]))[0];
            S.detId = id;
            const pagesBefore = context.pages().length;
            const link = rowLoc(page, id).getByRole('link', {name: 'Details'});
            out.link = {href: await link.getAttribute('href'), target: await link.getAttribute('target')};
            await Promise.all([page.waitForURL(/failedJobDetails/, {timeout: T}), link.click()]);
            await idle(page);
            out.sameTab = context.pages().length === pagesBefore;
            out.url = rel(page.url());
            const s = await snap(page, 'details');
            const t = await readTable(page);
            out.page = {title: s.title, headings: await page.locator('main h1, main h2, main h3').allInnerTexts(), head: t.head, attrs: t.rows.map((r) => r[0]), cells: t.rows.map((r) => [r[0], (r[1] || '').slice(0, 300), (r[1] || '').split('\n').length])};
            out.label = flat(s.text.main, 300);
            out.controls = {buttons: await page.locator('main').getByRole('button').allInnerTexts(), links: await page.locator('main').getByRole('link').allInnerTexts(), inputs: await page.locator('main input, main select, main textarea').count()};
            out.trail = await page.locator('nav[aria-label*="readcrumb" i], .pkpBreadcrumb, ol').first().innerText().catch(() => null);
            await loc(page, 'Details: the trail Administration link', page.getByRole('link', {name: 'Administration', exact: true}));
            const detailsUrl = page.url();
            await Promise.all([page.waitForURL((u) => !/failedJobDetails/.test(u.pathname), {timeout: T}), page.getByRole('link', {name: 'Administration', exact: true}).first().click()]);
            await idle(page);
            out.wayOut = {url: rel(page.url()), heading: await page.locator('main h1').first().innerText().catch(() => null)};
            // Delete it, then the noted address.
            await openList(page, app, 'failedJobs');
            out.deleted = await pressRowButton(page, id, 'Delete');
            const resp = await page.goto(detailsUrl);
            await idle(page);
            const s2 = await snap(page, 'details-gone');
            out.gone = {status: resp && resp.status(), title: s2.title, main: flat(s2.text.main, 400)};
            for (const [k, p] of [['noId', ''], ['letters', '/abc'], ['zero', '/0']]) {
                const r = await page.goto(app.url(`/index.php/index/en/admin/failedJobDetails${p}`));
                await idle(page);
                const sx = await snap(page, `details-${k}`);
                out[k] = {status: r && r.status(), title: sx.title, main: flat(sx.text.main, 300)};
            }
            return out;
        });

        // Rule 19 with the list over two pages, every job with its data.
        await phase('requeue', async () => {
            // Top the list up past 50 so a second page exists.
            const have = Number(sql(app, 'select count(*) from failed_jobs'));
            for (let i = have; i < 53; i++) await app.api.createJob({state: 'failed'});
            const out = {before: counts(app)};
            const maxJ = Number(sql(app, 'select coalesce(max(id),0) from jobs'));
            await openList(page, app, 'failedJobs');
            out.beforeLine = lineOf(await screen(page));
            out.beforePagination = await paginationRead(page);
            const w = page.waitForResponse((r) => /redispatch\/all/.test(r.url()), {timeout: T});
            await page.getByRole('button', {name: 'Requeue All Failed Jobs'}).click();
            const resp = await w;
            out.resp = {status: resp.status(), url: rel(resp.url()), body: flat(await resp.text(), 300)};
            out.notice = await notice(page);
            await sleep(500);
            await idle(page);
            const s = await snap(page, 'failed-after-requeue');
            out.now = {line: lineOf(s), table: await readTable(page), requeueAll: await page.getByRole('button', {name: 'Requeue All Failed Jobs'}).count(), pagination: await paginationRead(page)};
            await openList(page, app, 'failedJobs');
            out.reload = {line: lineOf(await screen(page)), rows: (await readTable(page)).rows.length};
            out.after = counts(app);
            out.newJobs = sql(app, `select count(*) || ' new, attempts ' || string_agg(distinct attempts::text, ',') || ', queues ' || string_agg(distinct queue, ',') from jobs where id > ${maxJ}`);
            await openList(page, app, 'jobs');
            const sj = await snap(page, 'jobs-after-requeue');
            out.jobsPage = {line: lineOf(sj), pagination: await paginationRead(page)};
            out.purge = cli(app, ['lib/pkp/tools/jobs.php', 'purge', '--queue=queuedTestJob']);
            return out;
        });

        // Rule 16/17b/19 and A4: failed jobs with no stored data (a state no
        // screen makes), and a failed job from the default queue.
        await phase('nopayload', async () => {
            const out = {};
            const f1 = await app.api.createJob({state: 'failed'});
            const f2 = await app.api.createJob({state: 'failed'});
            const f3 = await app.api.createJob({state: 'failed'});
            S.np = [f1.id, f2.id, f3.id];
            sql(app, `update failed_jobs set payload = '' where id in (${f1.id}, ${f2.id})`);
            out.ids = {noPayload: [f1.id, f2.id], withPayload: f3.id};
            await openList(page, app, 'failedJobs');
            const s = await snap(page, 'failed-nopayload');
            const t = await readTable(page);
            out.rows = t.rows;
            out.line = lineOf(s);
            out.tryAgain = {resp: await pressRowButton(page, f1.id, 'Try Again')};
            out.tryAgain.dialog = await errorDialog(page);
            await snap(page, 'nopayload-tryagain');
            if (out.tryAgain.dialog) await page.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
            await sleep(500);
            out.tryAgain.rowStays = await rowLoc(page, f1.id).count();
            // Its Details page.
            const r = await page.goto(app.url(`/index.php/index/en/admin/failedJobDetails/${f1.id}`));
            await idle(page);
            const sd = await snap(page, 'details-nopayload');
            out.details = {status: r && r.status(), attrs: ((await readTable(page)) || {rows: []}).rows.map((x) => [x[0], (x[1] || '').slice(0, 120)]), main: flat(sd.text.main, 300)};
            // Mixed: Requeue All leaves the two without data.
            const maxJ = Number(sql(app, 'select coalesce(max(id),0) from jobs'));
            await openList(page, app, 'failedJobs');
            const w = page.waitForResponse((x) => /redispatch\/all/.test(x.url()), {timeout: T});
            await page.getByRole('button', {name: 'Requeue All Failed Jobs'}).click();
            const resp = await w;
            out.mixed = {status: resp.status(), body: flat(await resp.text(), 300), notice: await notice(page)};
            await sleep(500);
            await idle(page);
            const sm = await snap(page, 'failed-after-mixed-requeue');
            out.mixed.now = {line: lineOf(sm), ids: (await readTable(page)).rows.map((x) => Number(x[0]))};
            out.mixed.newJobs = sql(app, `select count(*) from jobs where id > ${maxJ}`);
            // Only jobs without data left: Requeue All (A4).
            const maxJ2 = Number(sql(app, 'select coalesce(max(id),0) from jobs'));
            await openList(page, app, 'failedJobs');
            const w2 = page.waitForResponse((x) => /redispatch\/all/.test(x.url()), {timeout: T});
            await page.getByRole('button', {name: 'Requeue All Failed Jobs'}).click();
            const resp2 = await w2;
            out.onlyNoPayload = {status: resp2.status(), body: flat(await resp2.text(), 300), dialog: await errorDialog(page)};
            await snap(page, 'a4-requeue-dialog');
            if (out.onlyNoPayload.dialog) await page.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
            out.onlyNoPayload.notice = await page.locator('.pkpNotification').count();
            await sleep(1500);
            out.onlyNoPayload.spinners = await page.locator('main .pkpSpinner:visible').count();
            await idle(page);
            const so = await snap(page, 'failed-after-a4-requeue');
            out.onlyNoPayload.now = {line: lineOf(so), ids: ((await readTable(page)) || {rows: []}).rows.map((x) => Number(x[0]))};
            out.onlyNoPayload.db = {failedLeft: sql(app, `select count(*) from failed_jobs where id in (${f1.id}, ${f2.id})`), newJobs: sql(app, `select string_agg(id || ':' || queue || ':' || length(payload), ',') from jobs where id > ${maxJ2}`)};
            await openList(page, app, 'jobs');
            const sj = await snap(page, 'jobs-with-nopayload');
            out.onlyNoPayload.jobsPage = {line: lineOf(sj), rowsNew: ((await readTable(page)) || {rows: []}).rows.filter((x) => Number(x[0]) > maxJ2)};
            // Delete works on a failed job without data.
            await openList(page, app, 'failedJobs');
            out.deleteNoPayload = [];
            for (const id of [f1.id, f2.id]) {
                out.deleteNoPayload.push(await pressRowButton(page, id, 'Delete'));
                await closeNotices(page);
            }
            out.afterDeletes = counts(app);
            // A failed job from the default queue: Try Again sends it back there.
            const f4 = await app.api.createJob({state: 'failed'});
            sql(app, `update failed_jobs set queue = 'queue' where id = ${f4.id}`);
            const maxJ3 = Number(sql(app, 'select coalesce(max(id),0) from jobs'));
            await openList(page, app, 'failedJobs');
            out.defaultQueue = {id: f4.id, row: rowById(await readTable(page), f4.id), resp: await pressRowButton(page, f4.id, 'Try Again')};
            out.defaultQueue.newJob = sql(app, `select id || '|' || queue || '|' || attempts from jobs where id > ${maxJ3}`);
            S.defaultQueueJob = Number(out.defaultQueue.newJob.split('|')[0]);
            await openList(page, app, 'jobs');
            out.defaultQueue.jobsRow = rowById(await readTable(page), S.defaultQueueJob);
            return out;
        });

        // "Requeue All" on a list emptied elsewhere (a stale tab).
        await phase('stale', async () => {
            const out = {};
            const g = await app.api.createJob({state: 'failed'});
            // Leave only g on the list.
            out.others = sql(app, `select count(*) from failed_jobs where id <> ${g.id}`);
            const pageB = watch(await context.newPage(), 'B');
            try {
                await openList(page, app, 'failedJobs');
                await openList(pageB, app, 'failedJobs');
                const w = page.waitForResponse((x) => /redispatch\/all/.test(x.url()), {timeout: T});
                await page.getByRole('button', {name: 'Requeue All Failed Jobs'}).click();
                out.a = {status: (await w).status()};
                await idle(page);
                const w2 = pageB.waitForResponse((x) => /redispatch\/all/.test(x.url()), {timeout: T});
                await pageB.getByRole('button', {name: 'Requeue All Failed Jobs'}).click();
                const r2 = await w2;
                out.b = {status: r2.status(), body: flat(await r2.text(), 300), dialog: await errorDialog(pageB)};
                await snap(pageB, 'stale-requeue-tabB');
                if (out.b.dialog) await pageB.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                await sleep(1500);
                const sb = await snap(pageB, 'stale-requeue-tabB-afterok');
                out.b.after = {line: lineOf(sb), rowStays: await rowLoc(pageB, g.id).count(), spinners: await pageB.locator('main .pkpSpinner:visible').count(), pagination: await paginationRead(pageB), buttonDisabled: await pageB.getByRole('button', {name: 'Requeue All Failed Jobs'}).isDisabled().catch(() => null), table: await readTable(pageB)};
            } finally {
                await pageB.close().catch(() => {});
            }
            return out;
        });

        // Rule 20 / Settings 4: RemoveFailedJobs, run as the scheduler runs
        // it, over failed jobs 181 days, 180 days + 1 hour and 179 days old.
        await phase('prune', async () => {
            const out = {};
            const ages = {d181: 181 * 24, d180h1: 180 * 24 + 1, d179: 179 * 24};
            const ids = {};
            for (const k of Object.keys(ages)) {
                ids[k] = (await app.api.createJob({state: 'failed'})).id;
                sql(app, `update failed_jobs set failed_at = failed_at - interval '${ages[k]} hours' where id = ${ids[k]}`);
            }
            out.ids = ids;
            out.stamps = sql(app, `select string_agg(id || '=' || failed_at, ', ') from failed_jobs where id in (${Object.values(ids).join(',')})`);
            out.nowUtc = new Date().toISOString();
            out.schedule = (cli(app, ['lib/pkp/tools/scheduler.php', 'list']).match(/[^A-Za-z]*PKP\\task\\RemoveFailedJobs[^N]*Next Due: [^A-Z]*/) || [null])[0];
            await openList(page, app, 'failedJobs');
            await snap(page, 'prune-before');
            out.task = cli(app, ['lib/pkp/tools/scheduler.php', 'test', '--name=PKP\\task\\RemoveFailedJobs']);
            await openList(page, app, 'failedJobs');
            const s = await snap(page, 'prune-after');
            const t = await readTable(page);
            out.after = Object.fromEntries(Object.entries(ids).map(([k, id]) => [k, !!rowById(t, id)]));
            out.line = lineOf(s);
            out.rowSample = rowById(t, ids.d179);
            S.pruneLeft = Object.values(ids);
            return out;
        });

        // Settings 1–4: the [queues] values on System Information; Settings 3
        // Off: the every-minute task leaves a default-queue job waiting.
        await phase('settings', async () => {
            const out = {};
            await page.goto(app.url('/index.php/index/en/admin/systemInfo'));
            await idle(page);
            out.systemInfo = await page.evaluate(() => {
                const want = ['job_runner', 'job_runner_max_jobs', 'job_runner_max_execution_time', 'job_runner_max_memory', 'job_runner_cross_request_lock', 'process_jobs_at_task_scheduler', 'delete_failed_jobs_after', 'default_connection', 'default_queue'];
                const rows = [...document.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((c) => c.innerText.trim()));
                const found = rows.filter((r) => want.includes(r[0]));
                const qIdx = rows.findIndex((r) => r.length === 1 && /queues/i.test(r[0]) || (r[0] || '').toLowerCase() === 'queues');
                return {found, queuesHeaderRow: qIdx >= 0 ? rows[qIdx] : null, headingsWithQueues: [...document.querySelectorAll('h2,h3,h4,th,caption')].map((h) => h.innerText.trim()).filter((x) => /queue/i.test(x))};
            });
            await snap(page, 'systeminfo-queues');
            if (S.defaultQueueJob) {
                out.defaultJobBefore = sql(app, `select count(*) from jobs where id = ${S.defaultQueueJob}`);
                out.task = cli(app, ['lib/pkp/tools/scheduler.php', 'test', '--name=PKP\\task\\ProcessQueueJobs']);
                out.defaultJobAfter = sql(app, `select count(*) || ' attempts ' || coalesce(max(attempts),-1) from jobs where id = ${S.defaultQueueJob}`);
                await openList(page, app, 'jobs');
                out.jobsRow = rowById(await readTable(page), S.defaultQueueJob);
                sql(app, `delete from jobs where id = ${S.defaultQueueJob}`);
            }
            return out;
        });

        // The pages for a journal manager and signed out (typed addresses).
        await phase('access', async () => {
            const out = {};
            const id = S.pruneLeft ? S.pruneLeft[S.pruneLeft.length - 1] : 1;
            const paths = {jobs: 'jobs', failed: 'failedJobs', details: `failedJobDetails/${id}`};
            await signIn(page, 'manager.maya');
            for (const [k, p] of Object.entries(paths)) {
                const r = await page.goto(app.url(`/index.php/index/en/admin/${p}`));
                await idle(page);
                const s = await snap(page, `manager-${k}`);
                out[`manager_${k}`] = {status: r && r.status(), url: rel(page.url()), title: s.title, main: flat(s.text.main, 200)};
            }
            await signOut(page);
            for (const [k, p] of Object.entries(paths)) {
                const r = await page.goto(app.url(`/index.php/index/en/admin/${p}`));
                await idle(page);
                const s = await screen(page);
                out[`anon_${k}`] = {status: r && r.status(), url: rel(page.url()), title: s.title};
            }
            await signIn(page, 'admin');
            return out;
        });

        await phase('cleanup', async () => {
            const out = {before: counts(app)};
            out.purge = cli(app, ['lib/pkp/tools/jobs.php', 'purge', '--queue=queuedTestJob']);
            // Remaining failed jobs are this script's own (the fleet had none).
            await openList(page, app, 'failedJobs');
            const t = await readTable(page);
            const mine = t.rows.map((r) => Number(r[0])).filter((n) => Number.isFinite(n) && n > 0);
            for (const id of mine) {
                await closeNotices(page);
                await pressRowButton(page, id, 'Delete');
            }
            out.deletedOnScreen = mine;
            out.after = counts(app);
            return out;
        });
    } finally {
        R.dialogs = DIALOGS;
        R.jobApi = JOBAPI;
        R.crash = CRASH;
        record('k3', {dialogs: DIALOGS, jobApi: JOBAPI, crash: CRASH, S}, {merge: true});
        console.log(JSON.stringify(R, null, 1).slice(0, 30000));
        await close();
    }
});
