// U61 claim check, chunk K4: across the screens. Side effects (292–306), the
// Settings preamble (310–312), Cross-feature interactions (355–382), the
// Canonical preamble (386–389); footnotes j, o, q, u, w, sc. All three apps.
// Spec: docs/specs/U61-system-administration.md.
//
// What it drives, per app:
//  - seed:     one scratch journal "U61 K4 <t>" with one throwaway account per
//              permission level (manager, section editor, assistant, reviewer
//              where the app has one, author, reader).
//  - sysinfo:  Administration, System Information (every setting the spec's
//              Settings section names, the "logs" and "oai" groups, any
//              control on the page), Site Settings and Hosted Journals text
//              for those settings, the user menu's and the side menu's
//              "Administration" entries, the access-denied page.
//  - window:   every action of this spec pressed on screen as `admin` inside a
//              measured window: Delete Template Cache, Delete Data Caches, the
//              report's log link, Delete Task Logs, Check for updates,
//              Extended PHP Information, Try Again, Delete, Details, Requeue
//              All Failed Jobs, then Expire User Sessions. Read before/after:
//              notifications, event_log, email_log rows, the installation's log
//              file, Mailpit, sessions of the other apps, the accounts' rows;
//              then a task run that ends in error as the positive mail control,
//              and each account signs in with its old password.
//  - rerun:    the jobs "Try Again" and "Requeue All" put back are run by the
//              app's own worker (jobs.php run --test) and read on Failed Jobs
//              (new IDs); then deleted on screen, leaving no failed job.
// Fleet-global: "Expire User Sessions" signs out every session of the app's
// install and "Delete Task Logs" removes every task log: run it alone.
// Run: PROBE_FEATURE=U61 PROBE_AGENT=ccK4 node bin/probe.js <app|all> shared/playwright/checks/U61/K4/k4.js
//      PHASES=seed,sysinfo,window,rerun (default all)
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'sysinfo', 'window', 'rerun'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 20_000;
const REPO = path.resolve(__dirname, '../../../../..');
const MAILPIT = process.env.MAILPIT_URL || 'http://127.0.0.1:8025';
const flat = (s, n = 4000) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const log = (...a) => console.log('[k4]', new Date().toISOString().slice(11, 19), ...a);
const sql = (db, q) => execFileSync('psql', ['-d', db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const stateFile = (app) => path.join(outDir(), `k4-state-${app.name}.json`);
const loadState = (app) => { try { return JSON.parse(fs.readFileSync(stateFile(app), 'utf8')); } catch (e) { return {}; } };
const saveState = (app, s) => fs.writeFileSync(stateFile(app), JSON.stringify(s, null, 2));
function cli(app, args) {
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
}
function configAsWritten(app) {
    const f = path.resolve(REPO, app.root, 'config.test.inc.php');
    const out = [];
    let sec = null;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        const t = line.trim();
        const m = t.match(/^\[(.+)\]/);
        if (m) { sec = m[1]; continue; }
        const c = t.match(/^;\s*([a-z_]+)\s*=\s*(.*)$/);
        if (c) { out.push({section: sec, key: c[1], raw: c[2], commented: true}); continue; }
        const i = t.indexOf('=');
        if (t && !t.startsWith(';') && i > 0) out.push({section: sec, key: t.slice(0, i).trim(), raw: t.slice(i + 1).trim()});
    }
    return out;
}
const filesDir = (app) => (fs.readFileSync(path.resolve(REPO, app.root, 'config.test.inc.php'), 'utf8').match(/^files_dir\s*=\s*(.+)$/m) || [])[1].trim();
function appLog(app) {
    const dir = path.join(filesDir(app), 'logs');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => ({f, st: fs.statSync(path.join(dir, f))})) : [];
    return {dir, files: Object.fromEntries(files.map((x) => [x.f, x.st.size]))};
}
function appLogSince(before, after) {
    const out = [];
    for (const [f, size] of Object.entries(after.files)) {
        const from = before.files[f] || 0;
        if (size > from) {
            const buf = fs.readFileSync(path.join(after.dir, f));
            out.push(...buf.subarray(from).toString('utf8').split('\n').filter((l) => /^\[\d{4}-/.test(l)).map((l) => l.slice(0, 260)));
        }
    }
    return out;
}
const taskLogs = (app) => { const d = path.join(filesDir(app), 'scheduledTaskLogs'); return fs.existsSync(d) ? fs.readdirSync(d).length : null; };
async function mailSince(iso) {
    const r = await fetch(`${MAILPIT}/api/v1/messages?limit=100`).then((x) => x.json());
    return r.messages.filter((m) => new Date(m.Created) >= new Date(iso)).map((m) => ({created: m.Created, to: m.To.map((t) => t.Address).join(','), from: m.From.Address, subject: m.Subject}));
}
const OTHER = {ojs: ['omp', 'ops'], omp: ['ojs', 'ops'], ops: ['ojs', 'omp']};
const ROLES = {
    ojs: [['manager', 'manager'], ['subEditor', 'sectionEditor'], ['assistant', 'copyeditor'], ['reviewer', 'externalReviewer'], ['author', 'author'], ['reader', 'reader']],
    omp: [['manager', 'manager'], ['subEditor', 'sectionEditor'], ['assistant', 'copyeditor'], ['reviewer', 'externalReviewer'], ['author', 'author'], ['reader', 'reader']],
    ops: [['manager', 'manager'], ['subEditor', 'sectionEditor'], ['assistant', 'editorialBoardMember'], ['author', 'author'], ['reader', 'reader']],
};
// The settings the spec's "Settings that modify behavior" names, with the section it gives.
const NAMED = [['queues', 'job_runner'], ['queues', 'job_runner_max_jobs'], ['queues', 'job_runner_max_execution_time'], ['queues', 'job_runner_max_memory'],
    ['queues', 'job_runner_cross_request_lock'], ['queues', 'process_jobs_at_task_scheduler'], ['queues', 'delete_failed_jobs_after'],
    ['schedule', 'task_runner'], ['schedule', 'task_runner_interval'], ['schedule', 'scheduled_tasks_report_error_only'],
    ['general', 'show_upgrade_warning'], ['cache', 'web_cache'], ['cache', 'web_cache_hours'], ['security', 'password_timeout'], ['logs', 'log_audit']];

let CUR = 'init';
const CRASH = {};
const DIALOGS = [];
let ACCEPT = false;
function watch(page, label) {
    page.on('response', (r) => { if (r.status() >= 500) (CRASH[CUR] = CRASH[CUR] || []).push(`server ${r.status()} ${r.request().method()} ${rel(r.url()).slice(0, 200)} [${label}]`); });
    page.on('pageerror', (e) => { (CRASH[CUR] = CRASH[CUR] || []).push(`script ${String(e.message || e).slice(0, 200)} [${label}]`); });
    page.on('dialog', (d) => {
        DIALOGS.push({phase: CUR, tab: label, type: d.type(), message: d.message(), accepted: ACCEPT || d.type() === 'beforeunload'});
        (ACCEPT || d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {});
    });
    return page;
}
async function snap(page, name, extra = {}) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 300)}; }
    record(name, {...s, extra});
    await shot(page, name).catch(() => {});
    return s;
}
async function go(page, url) {
    try {
        const resp = await page.goto(url, {timeout: 45_000});
        await idle(page).catch(() => {});
        return resp ? resp.status() : null;
    } catch (e) { return `error ${String(e.message || e).slice(0, 160)}`; }
}
const heading = (page) => page.evaluate(() => { const h = (document.querySelector('main') || document.body).querySelector('h1'); return h ? h.textContent.replace(/\s+/g, ' ').trim() : null; }).catch(() => null);
const bodyStart = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 300)).catch(() => null);
async function where(page) { return {url: rel(page.url()), title: await page.title().catch(() => null), h1: await heading(page), body: await bodyStart(page)}; }
async function notice(page) {
    const n = page.locator('.pkpNotification').last();
    const seen = await n.waitFor({timeout: 8000}).then(() => true).catch(() => false);
    return seen ? flat(await n.innerText().catch(() => '')) : null;
}
async function openList(page, app, op) {
    const w = page.waitForResponse((r) => /\/api\/v1\/jobs\/(all|failed\/all)/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
    await page.goto(app.url(`/index.php/index/en/admin/${op}`));
    await w;
    await idle(page).catch(() => {});
}
async function readTable(page) {
    return page.evaluate(() => {
        const t = document.querySelector('main table');
        if (!t) return null;
        const cell = (c) => c.innerText.replace(/\s+/g, ' ').trim();
        return {head: [...t.querySelectorAll('thead th')].map(cell), rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td,th')].map(cell))};
    }).catch(() => null);
}
const rowLoc = (page, id) => page.locator('main table tbody tr').filter({has: page.locator('td').first().filter({hasText: new RegExp(`^\\s*${id}\\s*$`)})});
async function pressRow(page, id, name) {
    const w = page.waitForResponse((r) => /\/api\/v1\/jobs\//.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await rowLoc(page, id).getByRole('button', {name, exact: true}).click();
    const r = await w;
    return r ? {status: r.status(), url: rel(r.url()).slice(0, 120)} : null;
}
async function pressAdmin(page, app, name) {
    await go(page, app.url('/index.php/index/en/admin'));
    ACCEPT = true;
    try {
        await Promise.all([page.waitForNavigation({waitUntil: 'load', timeout: 30_000}).catch(() => {}),
            page.getByRole('button', {name, exact: true}).click()]);
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {});
    } finally { ACCEPT = false; }
    return where(page);
}
const userRows = (app, J) => sql(`${app.name}_test`, `select u.username, md5(u.password), u.email, u.disabled, u.must_change_password, u.date_last_login, (select string_agg(g.user_group_id::text || ':' || coalesce(g.date_end::text,''), ',' order by g.user_group_id) from user_user_groups g where g.user_id = u.user_id) from users u where u.username like '${J}%' order by 1`).split('\n');
const logCounts = (app) => {
    const r = sql(`${app.name}_test`, 'select (select coalesce(max(notification_id),0) from notifications), (select coalesce(max(log_id),0) from event_log), (select coalesce(max(log_id),0) from email_log), (select count(*) from notifications), (select count(*) from event_log), (select count(*) from email_log)').split('|').map(Number);
    return {maxNotification: r[0], maxEventLog: r[1], maxEmailLog: r[2], notifications: r[3], eventLog: r[4], emailLog: r[5]};
};
const sessions = (name) => Number(sql(`${name}_test`, 'select count(*) from sessions'));
forEachApp(async (app) => {
    const R = {app: app.name, started: new Date().toISOString()};
    const st = loadState(app);
    const {browser, page, close} = await launch(app);
    watch(page, 'admin');
    const extra = [];
    const phase = async (name, fn) => {
        if (!on(name)) return;
        CUR = `${app.name}:${name}`;
        log(app.name, name);
        try { R[name] = await fn(); } catch (e) {
            R[name] = {error: String(e.stack || e).slice(0, 1200)};
            await shot(page, `error-${name}`).catch(() => {});
        }
        R[name] = {...(R[name] || {}), crashes: CRASH[CUR] || [], dialogs: DIALOGS.filter((d) => d.phase === CUR)};
        record('k4', R, {merge: true});
    };
    try {
        await phase('seed', async () => {
            const J = tag('u61k4');
            const users = ROLES[app.name].map(([lvl, key]) => ({username: `${J}${lvl.slice(0, 3).toLowerCase()}`, roles: [key]}));
            await app.api.createContext({tag: J, context: {name: `U61 K4 ${J}`, acronym: 'K4J'}, users});
            Object.assign(st, {J, users: ROLES[app.name].map(([lvl], i) => ({lvl, username: users[i].username}))});
            saveState(app, st);
            return {J, users: st.users};
        });

        // ── 310–312, 294–295 (log_audit), 355–382 screen facts ─────────────────
        await phase('sysinfo', async () => {
            const out = {};
            await signIn(page, 'admin'); await idle(page).catch(() => {});
            await go(page, app.url('/index.php/index/en/admin'));
            await snap(page, 'admin-page');
            out.adminControls = await page.evaluate(() => [...document.querySelectorAll('main a, main button')].map((c) => ({tag: c.tagName.toLowerCase(), text: c.textContent.replace(/\s+/g, ' ').trim(), href: c.getAttribute('href'), form: c.form ? c.form.getAttribute('action') : null})));
            await page.getByRole('link', {name: 'View System Information'}).click();
            await page.waitForLoadState('load'); await idle(page).catch(() => {});
            await snap(page, 'sysinfo');
            await loc(page, 'System Information: configuration table', page.locator('main table[aria-labelledby="systemConfiguration"]'));
            const shown = await page.evaluate(() => {
                const t = document.querySelector('main table[aria-labelledby="systemConfiguration"]');
                const rows = [];
                let g = null;
                for (const tr of t ? t.querySelectorAll('tbody tr') : []) {
                    const tds = [...tr.querySelectorAll('td,th')];
                    if (tds.length === 1) { g = tds[0].textContent.trim(); continue; }
                    rows.push({section: g, key: tds[0].textContent.trim(), value: tds[1] ? tds[1].textContent.trim() : null});
                }
                const main = document.querySelector('main');
                return {rows, inputs: [...main.querySelectorAll('input, select, textarea, [contenteditable="true"]')].length,
                    buttons: [...main.querySelectorAll('button')].map((b) => b.textContent.trim()),
                    links: [...main.querySelectorAll('a')].map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))};
            });
            const cfg = configAsWritten(app);
            out.named = NAMED.map(([sec, key]) => {
                const row = shown.rows.find((r) => r.key === key);
                const file = cfg.find((c) => c.key === key && c.section === sec);
                return {key, specSection: sec, shownSection: row ? row.section : null, shownValue: row ? row.value : null, file: file ? `${file.commented ? ';' : ''}${file.raw}` : 'absent'};
            });
            out.logsGroup = shown.rows.filter((r) => r.section === 'logs');
            out.oaiGroup = shown.rows.filter((r) => r.section === 'oai');
            out.sysinfoInputs = shown.inputs; out.sysinfoButtons = shown.buttons; out.sysinfoLinks = shown.links;
            // Site Settings and Hosted Journals: does any screen offer these settings?
            const words = /job|queue|task|web cache|upgrade|password timeout|re-?authenticat|audit|runner/i;
            for (const [k, p] of [['siteSettings', '/admin/settings'], ['hosted', '/admin/contexts']]) {
                await go(page, app.url(`/index.php/index/en${p}`));
                await snap(page, `admin-${k}`);
                out[k] = await page.evaluate((re) => {
                    const r = new RegExp(re, 'i');
                    const main = document.querySelector('main') || document.body;
                    const labels = [...main.querySelectorAll('label, legend, th, [role="tab"], h2, h3, button, a')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
                    return {tabs: [...main.querySelectorAll('[role="tab"]')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
                        matches: [...new Set(labels.filter((l) => r.test(l)))].slice(0, 30),
                        contactEmail: [...main.querySelectorAll('input')].filter((i) => /@/.test(i.value)).map((i) => ({name: i.name, value: i.value})),
                        settingsWizard: /Settings wizard/i.test(main.textContent)};
                }, words.source);
            }
            // 366–367: the user menu's and the side menu's "Administration"
            await go(page, app.url('/index.php/publicknowledge/en'));
            await snap(page, 'admin-public-pk');
            out.userMenu = await page.evaluate(() => [...document.querySelectorAll('#navigationUser a')].map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})));
            await go(page, app.url('/index.php/publicknowledge/en/dashboard/editorial'));
            await snap(page, 'admin-editorial-pk');
            out.sideMenu = await page.evaluate(() => { const n = document.querySelector('nav#app-nav'); return n ? [...n.querySelectorAll('a')].map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})).filter((a) => /Administration/.test(a.text)) : null; });
            // 362–364: the access-denied page, a throwaway manager at Administration
            const mgr = st.users.find((u) => u.lvl === 'manager').username;
            await signIn(page, mgr, {contextPath: st.J}); await idle(page).catch(() => {});
            out.managerAtAdmin = {status: await go(page, app.url('/index.php/index/en/admin')), ...(await where(page))};
            await snap(page, 'manager-at-admin');
            await signOut(page);
            return out;
        });

        // ── 292–306, 386–389: every action inside a measured window ───────────
        await phase('window', async () => {
            const out = {};
            // Givens before the window: a task log to open, four failed jobs of our own.
            const t0 = await app.api.runTask({result: 'error'});
            out.preTask = t0;
            const F = [];
            for (let i = 0; i < 4; i++) F.push((await app.api.createJob({state: 'failed'})).id);
            out.failedIds = F; st.F = F;
            await signIn(page, 'admin'); await idle(page).catch(() => {});
            out.usersBefore = userRows(app, st.J);
            out.otherSessionsBefore = Object.fromEntries(OTHER[app.name].map((n) => [n, sessions(n)]));
            out.sessionsBefore = sessions(app.name);
            // The window
            const since = new Date().toISOString();
            const lc0 = logCounts(app); const log0 = appLog(app);
            out.taskLogsBefore = taskLogs(app);
            out.template = await pressAdmin(page, app, 'Delete Template Cache');
            await snap(page, 'after-template-cache');
            out.data = await pressAdmin(page, app, 'Delete Data Caches');
            await snap(page, 'after-data-caches');
            // the report's log link, opened as the Site Administrator
            const link = app.url(`/index.php/index/en/admin/downloadScheduledTaskLogFile?file=${encodeURIComponent(t0.logFile)}`);
            const dl = page.waitForEvent('download', {timeout: T}).catch(() => null);
            await page.evaluate((h) => { const a = document.createElement('a'); a.href = h; document.body.appendChild(a); a.click(); }, link);
            const d = await dl;
            out.logLink = d ? {file: d.suggestedFilename()} : null;
            out.taskDelete = await pressAdmin(page, app, 'Delete Task Logs');
            await snap(page, 'after-task-logs');
            out.taskLogsAfter = taskLogs(app);
            // System Information, Check for updates, Extended PHP Information
            await go(page, app.url('/index.php/index/en/admin/systemInfo'));
            const vc = page.waitForResponse((r) => /versionCheck=1/.test(r.url()), {timeout: T}).catch(() => null);
            await page.getByRole('link', {name: 'Check for updates'}).click();
            const vr = await vc; out.checkUpdates = vr ? vr.status() : null;
            await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
            await snap(page, 'after-check-updates');
            await go(page, app.url('/index.php/index/en/admin/systemInfo'));
            const [pop] = await Promise.all([page.context().waitForEvent('page', {timeout: T}), page.getByRole('link', {name: 'Extended PHP Information'}).click()]);
            await pop.waitForLoadState('load').catch(() => {}); out.phpinfo = await pop.title(); await pop.close();
            // Failed Jobs: Try Again F0, Delete F1, Details F2, Requeue All (F2, F3)
            await openList(page, app, 'failedJobs');
            await snap(page, 'failed-before');
            out.tryAgain = {resp: await pressRow(page, F[0], 'Try Again'), notice: await notice(page)};
            await openList(page, app, 'failedJobs');
            out.del = {resp: await pressRow(page, F[1], 'Delete'), notice: await notice(page)};
            await openList(page, app, 'failedJobs');
            await rowLoc(page, F[2]).getByRole('link', {name: 'Details'}).click();
            await page.waitForLoadState('load'); await idle(page).catch(() => {});
            out.details = await where(page);
            await snap(page, 'details');
            await openList(page, app, 'failedJobs');
            const w = page.waitForResponse((r) => /redispatch\/all/.test(r.url()), {timeout: T}).catch(() => null);
            await page.getByRole('button', {name: 'Requeue All Failed Jobs'}).click();
            const rr = await w; out.requeueAll = {status: rr ? rr.status() : null, notice: await notice(page)};
            await sleep(500); await idle(page).catch(() => {});
            await snap(page, 'failed-after-requeue');
            // Off end of the job runner: several requests later the put-back jobs still wait.
            for (const p of ['/admin', '/admin/systemInfo', '/admin/failedJobs']) await go(page, app.url(`/index.php/index/en${p}`));
            await openList(page, app, 'jobs');
            await snap(page, 'jobs-after-putback');
            out.jobsTable = await readTable(page);
            out.waitingTestJobs = sql(`${app.name}_test`, "select id || ':' || attempts from jobs where queue = 'queuedTestJob' order by id").split('\n').filter(Boolean);
            st.putBack = out.waitingTestJobs.map((x) => Number(x.split(':')[0]));
            saveState(app, st);
            // Expire User Sessions, last
            await go(page, app.url('/index.php/index/en/admin'));
            await snap(page, 'admin-before-expire');
            out.expire = await pressAdmin(page, app, 'Expire User Sessions');
            await snap(page, 'admin-after-expire');
            out.sessionsAfterExpire = sessions(app.name);
            out.otherSessionsAfter = Object.fromEntries(OTHER[app.name].map((n) => [n, sessions(n)]));
            out.usersAfterExpire = userRows(app, st.J);
            // Window closed: what was written
            await sleep(1500);
            const lc1 = logCounts(app); const log1 = appLog(app);
            out.logCounts = {before: lc0, after: lc1};
            out.appLogLines = appLogSince(log0, log1);
            out.auditLines = out.appLogLines.filter((l) => /sessions expired|cache cleared|task logs cleared|ADMIN_/i.test(l));
            out.mailInWindow = await mailSince(since);
            // Positive control: a task run that ends in error mails the principal contact.
            const t1 = await app.api.runTask({result: 'error'});
            const m = await app.mail.find({to: 'admin@mail.test', subject: t1.processId}).catch((e) => ({error: String(e.message).slice(0, 200)}));
            out.control = {processId: t1.processId, subject: m && m.Subject, to: m && m.To && m.To.map((x) => x.Address)};
            out.mailSinceStart = await mailSince(since);
            out.logCountsAfterTask = logCounts(app);
            // Each account signs in with its old password, each in its own browser.
            out.resignIn = [];
            for (const u of st.users) {
                const ctx = await browser.newContext({baseURL: app.baseURL, viewport: {width: 1280, height: 900}});
                const p = watch(await ctx.newPage(), u.lvl);
                await signIn(p, u.username, {contextPath: st.J}).catch(() => {});
                await p.waitForLoadState('load').catch(() => {}); await idle(p).catch(() => {});
                out.resignIn.push({lvl: u.lvl, ...(await where(p))});
                await snap(p, `resignin-${u.lvl}`);
                await ctx.close().catch(() => {});
            }
            out.dialogs = DIALOGS.filter((x) => x.phase === CUR);
            return out;
        });

        // ── 300–303: the put-back jobs fail again under a new ID ──────────────
        await phase('rerun', async () => {
            const out = {};
            const old = new Set((st.F || []).map(Number));
            await signIn(page, 'admin'); await idle(page).catch(() => {});
            out.failedBefore = sql(`${app.name}_test`, 'select id from failed_jobs order by id').split('\n').filter(Boolean).map(Number);
            out.worker = cli(app, ['lib/pkp/tools/jobs.php', 'run', '--test']);
            await openList(page, app, 'jobs');
            await snap(page, 'jobs-after-worker');
            out.jobsTable = await readTable(page);
            await openList(page, app, 'failedJobs');
            await snap(page, 'failed-after-worker');
            const tbl = await readTable(page);
            out.failedTable = tbl;
            out.newIds = (tbl && tbl.rows || []).map((r) => Number(r[0])).filter((id) => id && !old.has(id));
            out.oldStillListed = (tbl && tbl.rows || []).map((r) => Number(r[0])).filter((id) => old.has(id));
            // Cleanup on screen: delete every failed job this script made.
            out.cleanup = [];
            for (const id of out.newIds) {
                await openList(page, app, 'failedJobs');
                out.cleanup.push({id, resp: await pressRow(page, id, 'Delete')});
            }
            out.after = sql(`${app.name}_test`, "select (select count(*) from failed_jobs) || ' failed, ' || (select count(*) from jobs where queue='queuedTestJob') || ' test jobs waiting'");
            return out;
        });
    } finally {
        R.ended = new Date().toISOString();
        R.crashes = CRASH;
        record('k4', R, {merge: true});
        await close();
    }
});
