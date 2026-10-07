// U05 housekeeping claim check I29 (docs/process/briefs/claim-check.md):
// incidentals row 7, Rule 6's "Statistics report summary." row (who is told,
// "no task") and Rule 6's "no scenario produces those three emails".
//
// Per app, one scratch context holding one account per role the app ships
// among the editorial and control roles, one submission received in the
// previous month, then:
//   optOut   two recipients ("off": a Section Editor; "offm": a manager-level
//            role, Production Editor on a journal and a press, the manager on
//            a preprint server) untick "Enable these types of notifications."
//            on Profile › "Notifications", row "Statistics report summary.",
//            and save; read on the same page and after a reload. The first
//            also leaves the tab once with an unsaved change.
//   run      the monthly task, the way the scheduler runs it
//            (scenarios/task statisticsReport; no screen starts it).
//   mail     every account's mailbox: subject, footer, attachment.
//   tasks    every account signed in on its own Profile page opens the Tasks
//            bell and reads the rows; the Section Editor presses the entry.
//
// Run: RUN=r1 PROBE_FEATURE=U05 PROBE_AGENT=ccI29 node bin/probe.js all shared/playwright/checks/U05/I29/i29.js
// (RUN names the facts file, so each run keeps its own; ONLY=ojs narrows.)
const path = require('path');
const fs = require('fs');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const RUN = process.env.RUN || 'r1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

const now = new Date();
const PREV_MID = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15)).toISOString().slice(0, 10);

async function mailbox(app, address) {
    const base = app.mail.url;
    const res = await (await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}&limit=50`)).json();
    const out = [];
    for (const m of res.messages || []) {
        const full = await (await fetch(`${base}/api/v1/message/${m.ID}`)).json();
        out.push({
            subject: full.Subject,
            from: full.From,
            listUnsubscribe: full.ListUnsubscribe,
            attachments: (full.Attachments || []).map((a) => a.FileName),
            tail: (full.Text || '').trim().split('\n').slice(-3).join(' / '),
        });
    }
    return out;
}

forEachApp(async (app) => {
    const {ProfilePage} = require(path.join(REPO, 'shared/playwright/pages/ProfilePage.js'));
    const {TasksPanel} = require(path.join(REPO, 'shared/playwright/pages/NotificationsPages.js'));
    const A = app.name;
    const R = {app: A, run: RUN};
    const save = () => record(`i29-${RUN}`, R);
    const t = tag('u05i29');
    R.tag = t;

    // --------------------------------------------------------------- seed
    const roles = [
        ['mgr', ['manager']],
        ['se', ['sectionEditor']],
        ['off', ['sectionEditor']],
        ['au', ['author']],
        ['rd', ['reader']],
    ];
    if (A !== 'ops') {
        roles.push(['ed', ['editor']], ['pe', ['productionEditor']], ['offm', ['productionEditor']], ['cp', ['copyeditor']], ['rv', ['externalReviewer']], ['fc', ['funding']]);
    } else {
        roles.push(['offm', ['manager']], ['eb', ['editorialBoardMember']]);
    }
    if (A === 'ojs') {
        roles.push(['ge', ['guestEditor']]);
    }
    if (A === 'omp') {
        roles.push(['ve', ['volumeEditor']]);
    }
    const U = (k) => `${t}${k}`;
    R.accounts = Object.fromEntries(roles.map(([k, r]) => [k, r[0]]));
    R.seed = await app.api
        .createContext({tag: t, users: roles.map(([k, r]) => ({username: U(k), roles: r, email: `${U(k)}@mail.test`}))})
        .then((r) => ({contextId: r.contextId}))
        .catch((e) => ({error: e.message.slice(0, 600)}));
    R.sub = await app.api
        .createSubmission({tag: `${t}s`, context: t, submitter: U('au'), title: `I29 statistics ${t}`, dateSubmitted: PREV_MID})
        .then((r) => ({id: r.submissionId, dateSubmitted: r.dateSubmitted}))
        .catch((e) => ({error: e.message.slice(0, 400)}));
    save();
    if (R.seed.error) {
        return;
    }

    const {page, close} = await launch(app);
    page.setDefaultTimeout(30_000);
    const snap = async (name) => {
        const s = await screen(page);
        record(`${RUN}-${name}`, s);
        await shot(page, `${RUN}-${name}`);
        return s;
    };
    const readRow = async (profile) => {
        const pair = profile.notificationPair('notificationEditorialReport');
        const present = (await pair.allow.count()) > 0;
        return present
            ? {present, allow: await pair.allow.isChecked(), email: await pair.email.isChecked(), emailDisabled: await pair.email.isDisabled()}
            : {present};
    };

    try {
        // ------------------------------------------ optOut, on the screen
        R.optOut = {};
        for (const k of ['off', 'offm']) {
            const o = {};
            try {
                await signIn(page, U(k), {contextPath: t});
                const profile = new ProfilePage(page, t);
                await profile.goto('notifications');
                await idle(page);
                const s0 = await snap(`${k}-notif-before`);
                o.table = await profile.notificationTable();
                o.intro = flat(s0.text.main, 300);
                o.before = await readRow(profile);
                const pair = profile.notificationPair('notificationEditorialReport');
                await pair.allow.uncheck();
                o.afterClick = await readRow(profile);
                const posted = page.waitForRequest((r) => r.method() === 'POST' && /save-notification-settings/.test(r.url()));
                await profile.save();
                o.postedEditorialReport = decodeURIComponent((await posted).postData() || '')
                    .split('&')
                    .filter((p) => /EditorialReport/.test(p));
                await sleep(800);
                const s1 = await snap(`${k}-notif-saved`);
                o.samePage = {...(await readRow(profile)), notice: flat(await profile.inTabNotice('notifications').innerText().catch(() => ''), 200), notices: s1.notices};
                await profile.goto('notifications');
                await idle(page);
                await snap(`${k}-notif-reloaded`);
                o.reloaded = await readRow(profile);
                if (k === 'off') {
                    // Leave the tab once with an unsaved change: tick "Do not send
                    // me an email…" on the "Weekly email of outstanding tasks" row.
                    const other = profile.notificationPair('notificationEditorialReminder');
                    o.leave = {before: {email: await other.email.isChecked()}};
                    await other.email.check();
                    o.leave.cancelMsg = await profile.openAnswering('identity', {proceed: false});
                    o.leave.afterCancel = {email: await other.email.isChecked()};
                    o.leave.okMsg = await profile.openAnswering('identity', {proceed: true});
                    await snap('off-left-tab');
                    await profile.open('notifications');
                    o.leave.afterReopen = {email: await other.email.isChecked(), report: await readRow(profile)};
                    await loc(page, 'Profile › Notifications: "Statistics report summary." Enable box', page.locator('form#notificationSettingsForm input#notificationEditorialReport'));
                }
            } catch (e) {
                o.error = flat(e.stack || e.message, 800);
                await snap(`${k}-notif-error`).catch(() => {});
            }
            R.optOut[k] = o;
            save();
        }
        // the Author's tab: the Editors group and its row
        try {
            await signIn(page, U('au'), {contextPath: t});
            const profile = new ProfilePage(page, t);
            await profile.goto('notifications');
            await idle(page);
            await snap('au-notif');
            R.authorRow = await readRow(profile);
        } catch (e) {
            R.authorRow = {error: flat(e.message, 300)};
        }
        await signOut(page);
        save();

        // ------------------------------------------------------------ run
        {
            const t0 = Date.now();
            R.run = await app.api.runTask({task: 'statisticsReport', context: t}).catch((e) => ({error: e.message.slice(0, 200)}));
            R.run.ms = Date.now() - t0;
            if (R.run.error && /socket hang up|ECONNRESET/.test(R.run.error)) {
                // PHP 8.3's php -S could die (exit 139, php-src GH-20469; fixed on main by
                // pkp/pkp-lib#12915, the stable lines still have it) inside the
                // request after the Tasks job ran; the email job stays reserved.
                // Finish it the command line's way (what the scheduler's own
                // run does), so the mailboxes read below are the run's.
                await sleep(2000);
                const db = fs.readFileSync(app.configFile, 'utf8').match(/\[database\][\s\S]*?\nname = (\S+)/)[1];
                const psql = (sql) => execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', db, '-Atc', sql], {env: {...process.env, PGPASSWORD: 'e2e'}, encoding: 'utf8'}).trim();
                R.run.fallback = {unreserved: psql("update jobs set reserved_at = null where payload::text like '%StatisticsReportMail%' returning id")};
                R.run.fallback.worker = execFileSync('php', ['lib/pkp/tools/jobs.php', 'work', '--stop-when-empty'], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 300_000})
                    .split('\n')
                    .filter((l) => /StatisticsReport/.test(l))
                    .map((l) => l.replace(/^\[[^\]]+\]/, '').trim());
            }
            R.run.notified = (R.run.notified || []).map((u) => u.replace(t, '{t}'));
            R.run.mailed = (R.run.mailed || []).map((u) => u.replace(t, '{t}'));
            save();
        }
        await sleep(1500);

        // ----------------------------------------------------------- mail
        R.mail = {};
        for (const [k] of roles) {
            R.mail[k] = await mailbox(app, `${U(k)}@mail.test`);
        }
        save();

        // ---------------------------------------------------------- tasks
        R.tasks = {};
        for (const [k] of roles) {
            const e = {};
            try {
                await signIn(page, U(k), {contextPath: t});
                await page.goto(app.url(`/index.php/${t}/user/profile`));
                await idle(page);
                const panel = new TasksPanel(page);
                e.bell = await panel.count();
                await panel.open();
                e.rows = await panel.rowTexts();
                await snap(`${k}-tasks`);
                if (k === 'se') {
                    await loc(page, 'Tasks panel: the statistics report row', panel.row('kind reminder'));
                    const row = panel.row('kind reminder').first();
                    if (await row.count()) {
                        await panel.openTask(row);
                        await page.waitForLoadState('domcontentloaded');
                        await idle(page);
                        await sleep(800);
                        const p = await snap('se-task-pressed');
                        e.pressed = {url: page.url().replace(app.baseURL, '').replace(t, '{t}'), main: flat(p.text.main, 200)};
                        await page.goto(app.url(`/index.php/${t}/user/profile`));
                        await idle(page);
                        e.bellAfter = await panel.count();
                    }
                } else {
                    await panel.close();
                }
            } catch (err) {
                e.error = flat(err.message, 300);
                await snap(`${k}-tasks-error`).catch(() => {});
            }
            R.tasks[k] = e;
            save();
        }
        await signOut(page);
    } finally {
        save();
        await close();
    }
});
