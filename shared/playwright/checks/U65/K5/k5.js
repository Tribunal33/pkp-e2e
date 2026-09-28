// U65 claim check K5 (docs/process/briefs/claim-check.md): the monthly
// statistics email, its Tasks entry, opting out, the two settings, the side
// effects, and the Actors rows on "Reports" and on the email.
//
// Per app, four scratch contexts:
//   X  every role of the app, a principal contact of its own, submissions
//      dated around the previous month, two opt-outs saved on Profile ›
//      "Notifications", then the monthly task run (scenarios/task
//      statisticsReport); the emails read in Mailpit, their links opened,
//      the Tasks panels read and pressed, the Unsubscribe page used, the
//      template edited on "Manage Emails" and the task run again.
//   Y  no submission; "Editorial statistics" set to "Do not send the email
//      to editors." on screen, the task run, turned back on, run again.
//   Z  primary language French (Canada): the month's name.
//   Z2 the same French journal run the command line's way (block Zcli).
//   W  the task queued the command line's way (cli-statsreport.php), the
//      Administration › "View Jobs" page read, then the queue run (the
//      fleet's waiting jobs are drained first, so the page lists the two).
// Plus the addresses of "Reports" and Settings › Workflow for one account per
// permission level, and signed out; and the side effects of the statistics
// pages (block sideEffects) with the "Report Plugins" rows.
//
// Run: PROBE_FEATURE=U65 PROBE_AGENT=ccK5 node bin/probe.js all shared/playwright/checks/U65/K5/k5.js
// K5_SKIP=W,Z (comma list of blocks) narrows a rerun.
const path = require('path');
const fs = require('fs');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const SKIP = new Set((process.env.K5_SKIP || '').split(',').filter(Boolean));
const DENIED = 'The current role does not have access to this operation.';

const ymd = (d) => d.toISOString().slice(0, 10);
const now = new Date();
const Y0 = now.getUTCFullYear();
const M0 = now.getUTCMonth();
const DAYS = {
    before: ymd(new Date(Date.UTC(Y0, M0 - 1, 0))), // last day of the month before the previous one
    first: ymd(new Date(Date.UTC(Y0, M0 - 1, 1))), // first day of the previous month
    mid: ymd(new Date(Date.UTC(Y0, M0 - 1, 15))),
    mid2: ymd(new Date(Date.UTC(Y0, M0 - 1, 20))),
    last: ymd(new Date(Date.UTC(Y0, M0, 0))), // last day of the previous month
    after: ymd(new Date(Date.UTC(Y0, M0, 1))), // first day of this month
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function dbName(app) {
    const config = fs.readFileSync(path.join(REPO, 'checkouts', app.name, 'config.test.inc.php'), 'utf8');
    return config.match(/\[database\][\s\S]*?\nname = (\S+)/)[1];
}
function psql(app, sql) {
    const out = execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', dbName(app), '-AtF', '\t', '-c', sql], {
        env: {...process.env, PGPASSWORD: 'e2e'},
        encoding: 'utf8',
    });
    return out.trim() === '' ? [] : out.trim().split('\n').map((line) => line.split('\t'));
}
function envFile(app) {
    const text = fs.readFileSync(path.join(REPO, 'checkouts', app.name, '.env.playwright'), 'utf8');
    return Object.fromEntries(text.split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
}

// Every message to one address, newest first, with its attachments' bytes.
async function mailbox(app, address) {
    const base = app.mail.url;
    const res = await (await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}&limit=50`)).json();
    const out = [];
    for (const m of res.messages || []) {
        const full = await (await fetch(`${base}/api/v1/message/${m.ID}`)).json();
        const attachments = [];
        for (const a of full.Attachments || []) {
            const buf = Buffer.from(await (await fetch(`${base}/api/v1/message/${m.ID}/part/${a.PartID}`)).arrayBuffer());
            attachments.push({name: a.FileName, type: a.ContentType, size: a.Size, bom: buf.subarray(0, 3).toString('hex') === 'efbbbf', text: buf.toString('utf8').replace(/^﻿/, '')});
        }
        out.push({id: m.ID, created: m.Created, subject: full.Subject, from: full.From, to: full.To, cc: full.Cc, replyTo: full.ReplyTo, listUnsubscribe: full.ListUnsubscribe, text: full.Text, html: full.HTML, attachments});
    }
    return out;
}
function anchors(html) {
    const out = [];
    const re = /<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html || '')) !== null) {
        out.push({text: m[3].replace(/<[^>]+>/g, '').trim(), href: m[2].replace(/&amp;/g, '&')});
    }
    return out;
}
const brief = (m) => m && ({id: m.id, subject: m.subject, from: m.from, to: m.to, text: m.text, links: anchors(m.html), listUnsubscribe: m.listUnsubscribe, attachments: m.attachments});

forEachApp(async (app) => {
    const {ProfilePage} = require(path.join(REPO, 'shared/playwright/pages/ProfilePage.js'));
    const {TasksPanel, UnsubscribePage} = require(path.join(REPO, 'shared/playwright/pages/NotificationsPages.js'));
    const {WorkflowEmailsSettingsPage, ManageEmailsPage} = require(path.join(REPO, 'shared/playwright/pages/EmailsPages.js'));
    const A = app.name;
    const R = {app: A, days: DAYS};
    const save = () => record('k5', R);
    const block = async (name, fn) => {
        if (SKIP.has(name)) {
            return;
        }
        const o = {};
        R[name] = o;
        try {
            const r = await fn(o);
            if (r && r !== o) {
                Object.assign(o, r);
            }
        } catch (e) {
            o.error = flat(e.stack || e.message, 1500);
            console.error(A, name, e.message);
        }
        save();
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(30_000);
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        await shot(page, name);
        return s;
    };
    const go = async (p) => {
        const resp = await page.goto(app.url(p));
        await idle(page);
        return resp ? resp.status() : null;
    };
    const classify = async () => {
        const main = flat(await page.locator('main').first().innerText().catch(() => page.locator('body').innerText()), 600);
        const login = (await page.locator('form#login').count()) > 0;
        return {url: page.url().replace(app.baseURL, ''), login, denied: main.includes(DENIED), h1: flat(await page.locator('main h1, h1').first().innerText().catch(() => ''), 80), main: main.slice(0, 300)};
    };
    const sideNav = async () => flat(await page.getByRole('navigation', {name: 'Site Navigation'}).innerText().catch(() => ''), 600);
    const sideNavLinks = async () => page.getByRole('navigation', {name: 'Site Navigation'}).locator('a').evaluateAll((as) => as.map((a) => [a.textContent.replace(/\s+/g, ' ').trim(), (a.getAttribute('href') || '').replace(/^.*index\.php/, '')])).catch(() => []);
    const notifRow = async (ctx) => {
        const profile = new ProfilePage(page, ctx);
        await profile.goto('notifications');
        await idle(page);
        const table = await profile.notificationTable();
        const pair = profile.notificationPair('notificationEditorialReport');
        const present = (await pair.allow.count()) > 0;
        return {
            table,
            present,
            allow: present ? await pair.allow.isChecked() : null,
            email: present ? await pair.email.isChecked() : null,
            emailDisabled: present ? await pair.email.isDisabled() : null,
        };
    };

    try {
        // ------------------------------------------------------------ seeds
        const X = tag('u65k5x');
        const Yc = tag('u65k5y');
        const Z = tag('u65k5z');
        const W = tag('u65k5w');
        R.tags = {X, Y: Yc, Z, W};
        const mk = (t) => (k, roles, extra = {}) => ({username: `${t}${k}`, roles, email: `${t}${k}-${A}@mail.test`, ...extra});
        const u = mk(X);
        const usersX = [
            u('jm', ['manager']), u('j2', ['manager']), u('se', ['sectionEditor']), u('so', ['sectionEditor']), u('sn', ['sectionEditor']),
            u('sd', ['sectionEditor'], {disabled: true}), u('md', ['manager'], {disabled: true}),
            u('sp', [], {pastRoles: [{role: 'sectionEditor'}]}), u('au', ['author']), u('rd', ['reader']),
        ];
        if (A !== 'ops') {
            usersX.push(u('ed', ['editor']), u('pe', ['productionEditor']), u('rv', ['externalReviewer']), u('cp', ['copyeditor']));
        }
        if (A === 'ojs') {
            usersX.push(u('ge', ['guestEditor']), u('sm', ['subscriptionManager']));
        }
        if (A === 'omp') {
            usersX.push(u('ve', ['volumeEditor']), u('ir', ['internalReviewer']));
        }
        if (A === 'ops') {
            usersX.push(u('eb', ['editorialBoardMember']));
        }
        const keysX = usersX.map((x) => x.username.slice(X.length));
        R.usersX = usersX.map((x) => ({k: x.username.slice(X.length), roles: x.roles, disabled: !!x.disabled, pastRoles: x.pastRoles || null}));
        R.seedX = await app.api.createContext({tag: X, context: {contactName: 'Kay Principal', contactEmail: `${X}pc-${A}@mail.test`}, users: usersX}).then((r) => ({contextId: r.contextId})).catch((e) => ({error: e.message.slice(0, 600)}));
        const subs = [
            ['b', DAYS.before, {}],
            ['f', DAYS.first, A === 'ops' ? {} : {decisions: ['accept']}],
            ['d', DAYS.mid, {decisions: [A === 'ops' ? 'decline' : 'initialDecline']}],
            ['p', DAYS.mid2, {published: true}],
            ['l', DAYS.last, {}],
            ['a', DAYS.after, {}],
            ['t', null, {}],
            ['r', null, {submitted: false}],
        ];
        R.subsX = {};
        for (const [k, day, extra] of subs) {
            const spec = {tag: `${X}w${k}`, context: X, submitter: `${X}au`, title: `K5 ${k} ${X}`, ...extra};
            if (day) {
                spec.dateSubmitted = day;
            }
            R.subsX[k] = await app.api.createSubmission(spec).then((r) => ({id: r.submissionId, stageId: r.stageId, status: r.status, dateSubmitted: r.dateSubmitted, daysShifted: r.daysShifted})).catch((e) => ({error: e.message.slice(0, 400)}));
        }
        const uy = mk(Yc);
        R.seedY = await app.api.createContext({tag: Yc, users: [uy('jm', ['manager']), uy('se', ['sectionEditor']), uy('s2', ['sectionEditor']), uy('au', ['author'])]}).then((r) => ({contextId: r.contextId})).catch((e) => ({error: e.message.slice(0, 600)}));
        save();

        // ------------------------------------------ Profile › Notifications, X
        // Rule 28 / Settings bullet 2 on screen: "so" unticks "Enable…", "sn"
        // ticks "Do not send me an email…"; read after the save and after a reload.
        await block('optOut', async (out) => {
            for (const [k, what] of [['so', 'allow'], ['sn', 'email']]) {
                await signIn(page, `${X}${k}`);
                const profile = new ProfilePage(page, X);
                const before = await notifRow(X);
                const s0 = await snap(`x-${k}-notif-before`);
                const pair = profile.notificationPair('notificationEditorialReport');
                if (what === 'allow') {
                    await pair.allow.uncheck();
                } else {
                    await pair.email.check();
                }
                const afterClick = {allow: await pair.allow.isChecked(), email: await pair.email.isChecked(), emailDisabled: await pair.email.isDisabled()};
                const posted = page.waitForRequest((r) => r.method() === 'POST' && /save-notification-settings/.test(r.url()));
                await profile.save();
                const body = decodeURIComponent(((await posted).postData() || '').replace(/csrfToken=[^&]+/, 'csrfToken=…'));
                await sleep(800);
                const sSaved = await snap(`x-${k}-notif-saved`);
                const samePage = {allow: await pair.allow.isChecked(), email: await pair.email.isChecked(), notice: flat(await profile.inTabNotice('notifications').innerText().catch(() => ''), 200)};
                const reloaded = await notifRow(X);
                await snap(`x-${k}-notif-reloaded`);
                out[k] = {before: {present: before.present, allow: before.allow, email: before.email, emailDisabled: before.emailDisabled}, afterClick, postedEditorialReport: body.split('&').filter((p) => /EditorialReport/.test(p)), samePage, reloaded: {allow: reloaded.allow, email: reloaded.email, emailDisabled: reloaded.emailDisabled}, headerAfterSave: flat(sSaved.text.header, 200), table: k === 'so' ? before.table : undefined, snaps: [s0.url]};
            }
            // The tab left with an unsaved change: which question, and what stays.
            {
                const profile = new ProfilePage(page, X);
                await profile.goto('notifications');
                const pair = profile.notificationPair('notificationEditorialReport');
                await pair.allow.uncheck();
                const cancelMsg = await profile.openAnswering('identity', {proceed: false});
                const staysCancel = {allow: await pair.allow.isChecked()};
                const okMsg = await profile.openAnswering('identity', {proceed: true});
                await snap('x-sn-left-tab');
                const back = await notifRow(X);
                out.leave = {cancelMsg, staysCancel, okMsg, afterReopen: {allow: back.allow, email: back.email}};
                await loc(page, 'Profile › Notifications: "Statistics report summary." Enable box', page.locator('form#notificationSettingsForm input#notificationEditorialReport'));
                await loc(page, 'Profile › Notifications: "Statistics report summary." Do not send email box', page.locator('form#notificationSettingsForm input#emailNotificationEditorialReport'));
            }
            await signOut(page);
            return out;
        });

        // ------------------------------------- JM's screens on X before the run
        await block('jmX', async (out) => {
            await signIn(page, `${X}jm`);
            await go(`/index.php/${X}/stats/editorial`);
            await sleep(1000);
            const ea = await snap('x-ea');
            out.ea = {main: flat(ea.text.main, 1500)};
            // Custom Range over the previous month (Rule 25's figures on screen).
            try {
                await page.getByRole('button', {name: 'Change date range'}).click();
                await page.locator('.pkpDateRange__options').waitFor();
                await page.locator('.pkpDateRange__input--start').fill(DAYS.first);
                await page.locator('.pkpDateRange__input--end').fill(DAYS.last);
                await page.locator('.pkpDateRange__form').getByRole('button').click();
                await sleep(1500);
                await idle(page);
                const m = await snap('x-ea-month');
                out.eaMonth = {main: flat(m.text.main, 1500)};
            } catch (e) {
                out.eaMonth = {error: e.message.slice(0, 300)};
            }
            await go(`/index.php/${X}/stats/users`);
            await sleep(800);
            const us = await snap('x-users');
            out.users = {main: flat(us.text.main, 800)};
            // Settings › Workflow › Emails, read-only: the choice and the Signature.
            const emails = new WorkflowEmailsSettingsPage(page, X);
            await emails.goto();
            const group = page.getByRole('group', {name: 'Editorial statistics'});
            out.emailsTab = {
                radios: await group.getByRole('radio').evaluateAll((rs) => rs.map((r) => [((r.closest('label') || {}).textContent || '').replace(/\s+/g, ' ').trim(), r.checked])),
                groupText: flat(await group.innerText(), 300),
                signature: await emails.signatureHtml(),
            };
            await snap('x-emails-tab');
            await loc(page, 'Settings › Workflow › Emails: "Editorial statistics" group', group);
            // "Manage Emails" › "Statistics Report Notification", read-only.
            const manage = new ManageEmailsPage(page, X);
            await manage.goto();
            const opened = await manage.openEmail('Statistics Report Notification');
            await sleep(800);
            const w = await snap('x-manage-stats-email');
            out.manage = {kind: opened.kind, dialog: flat(w.text.dialog, 1500)};
            if (opened.kind === 'several') {
                out.manage.rows = await manage.templateRowsRead(opened.window);
                await manage.openTemplate(opened.window, out.manage.rows[0].name);
            }
            out.manage.subject = await manage.subjectBox().inputValue();
            out.manage.body = await manage.bodyHtml();
            await snap('x-manage-stats-template');
            await signOut(page);
            return out;
        });

        // ------------------------------------------------------ run 1 on X
        await block('run1', async () => {
            const t0 = Date.now();
            const r = await app.api.runTask({task: 'statisticsReport', context: X});
            return {ms: Date.now() - t0, ...r};
        });
        await sleep(1500);
        await block('mail1', async (out) => {
            for (const k of keysX) {
                const box = await mailbox(app, `${X}${k}-${A}@mail.test`);
                out[k] = {count: box.length, subjects: box.map((m) => m.subject)};
                if (['jm', 'se', 'sd', 'md', 'j2', 'sn'].includes(k) && box[0]) {
                    out[k].first = brief(box[0]);
                }
            }
            const admin = (await mailbox(app, 'admin@mail.test')).filter((m) => (m.text || '').includes(`/${X}/`));
            out.admin = {count: admin.length, subject: admin[0] && admin[0].subject, to: admin[0] && admin[0].to};
            out.principal = {count: (await mailbox(app, `${X}pc-${A}@mail.test`)).length};
            return out;
        });
        await block('notifRows1', async () => ({
            report: psql(app, `select u.username, n.level from notifications n join users u on u.user_id=n.user_id where u.username like '${X}%' and n.type=16777258 order by 1,2`),
            rows: psql(app, `select u.username, n.level, n.type, to_char(n.date_created,'YYYY-MM-DD'), coalesce(n.date_read::text,'') from notifications n join users u on u.user_id=n.user_id where u.username like '${X}%' order by 1,2`),
        }));

        // The email as a recipient sees it (Mailpit's HTML view) and its links.
        await block('links1', async (out) => {
            const m = R.mail1 && R.mail1.jm && R.mail1.jm.first;
            if (!m) {
                return {error: 'no email to jm'};
            }
            await page.goto(`${app.mail.url}/view/${m.id}.html`);
            await page.waitForLoadState('load');
            const v = await snap('x-mail-jm-view');
            out.view = flat(v.text.main, 1500);
            const links = m.links;
            out.links = links;
            const targets = links.filter((l) => /stats\//.test(l.href));
            for (const who of ['jm', 'se', null]) {
                if (who) {
                    await signIn(page, `${X}${who}`);
                } else {
                    await signOut(page);
                }
                for (const l of targets) {
                    await page.goto(l.href);
                    await idle(page);
                    await sleep(500);
                    const name = `x-link-${who || 'out'}-${l.href.split('/').pop()}`;
                    await snap(name);
                    out[`${who || 'out'}:${l.text}`] = await classify();
                }
            }
            return out;
        });

        // ---------------------------------------------- the Tasks panel, X
        await block('tasks1', async (out) => {
            const keys = ['se', 'jm', 'sn', 'so', 'au'];
            if (A !== 'ops') {
                keys.push('cp');
            } else {
                keys.push('eb');
            }
            for (const k of keys) {
                await signIn(page, `${X}${k}`, {contextPath: X});
                const landing = page.url().replace(app.baseURL, '');
                await go(`/index.php/${X}/submissions`);
                const l = await snap(`x-${k}-landing`);
                const panel = new TasksPanel(page);
                const entry = {landing, landingMentions: /kind reminder|health/i.test(`${l.text.main} ${l.text.header}`)};
                try {
                    entry.bell = await panel.count();
                    await panel.open();
                    entry.rows = await panel.rowTexts();
                    await snap(`x-${k}-tasks`);
                    if (k === 'se') {
                        await loc(page, 'Tasks panel: the statistics report row', panel.row('kind reminder'));
                        const row = panel.row('kind reminder').first();
                        entry.unreadBefore = (await row.locator('div.task.unread').count()) > 0;
                        entry.linkHref = await panel.link(row).getAttribute('href').catch(() => null);
                        await panel.openTask(row);
                        await page.waitForLoadState('domcontentloaded');
                        await idle(page);
                        await sleep(800);
                        const t = await snap('x-se-task-pressed');
                        entry.pressed = {url: page.url().replace(app.baseURL, ''), h1: flat(t.text.main, 200)};
                        await page.goBack().catch(() => {});
                        await go(`/index.php/${X}/submissions`);
                        entry.bellAfter = await panel.count();
                        await panel.open();
                        const row2 = panel.row('kind reminder').first();
                        entry.unreadAfter = (await row2.count()) ? (await row2.locator('div.task.unread').count()) > 0 : null;
                        entry.rowsAfter = await panel.rowTexts();
                        await panel.close();
                        // the public side's header as the same account
                        await go(`/index.php/${X}`);
                        const pub = await snap('x-se-public');
                        entry.publicHeader = flat(pub.text.header || '', 300);
                    } else {
                        await panel.close();
                    }
                } catch (e) {
                    entry.error = e.message.slice(0, 300);
                    await snap(`x-${k}-tasks-error`);
                }
                out[k] = entry;
            }
            await signOut(page);
            return out;
        });

        // A disabled recipient tries to sign in (the disabled-recipient premise,
        // not reproduced and deleted from the spec).
        // In a browser of its own: a refused sign-in leaves the next sign-in
        // in the same browser bounced back to the Login page.
        await block('disabledLogin', async () => {
            const fresh = await launch(app);
            try {
                const p = fresh.page;
                await p.goto(app.url(`/index.php/${X}/login`));
                await idle(p);
                await p.locator('input#username').fill(`${X}sd`);
                await p.evaluate(() => document.querySelector('input#password') && document.querySelector('input#password').removeAttribute('maxlength'));
                await p.locator('input#password').fill(`${X}sd${X}sd`);
                await p.locator('form#login button[type="submit"]').click();
                await p.waitForLoadState('domcontentloaded');
                await idle(p);
                const s = await screen(p);
                record('x-sd-login', s);
                await shot(p, 'x-sd-login');
                return {url: p.url().replace(app.baseURL, ''), main: flat(s.text.main, 400)};
            } finally {
                await fresh.close();
            }
        });

        // ------------------------------------------------- Unsubscribe, j2
        await block('unsub', async (out) => {
            const m = R.mail1 && R.mail1.j2 && R.mail1.j2.first;
            const link = m && (m.links.find((l) => /unsubscribe/i.test(l.href)) || {}).href;
            out.link = link ? link.replace(/validate=[^&]+/, 'validate=…') : null;
            if (!link) {
                return out;
            }
            const fresh = await launch(app);
            try {
                const p = fresh.page;
                const un = new UnsubscribePage(p);
                await un.goto(link);
                await idle(p);
                const s = await screen(p);
                record('x-unsub-page', s);
                await shot(p, 'x-unsub-page');
                out.page = flat(s.text.main, 1200);
                out.labels = await un.boxLabels();
                out.boxes = await un.boxes().evaluateAll((bs) => bs.map((b) => [b.id, b.checked]));
                await un.unsubscribe();
                await idle(p);
                const r = await screen(p);
                record('x-unsub-result', r);
                await shot(p, 'x-unsub-result');
                out.result = flat(r.text.main, 600);
            } finally {
                await fresh.close();
            }
            await signIn(page, `${X}j2`);
            const row = await notifRow(X);
            await snap('x-j2-notif-after-unsub');
            out.profileAfter = {present: row.present, allow: row.allow, email: row.email};
            await signOut(page);
            return out;
        });

        // --------------------------- "Manage Emails": edit the subject, X
        await block('editTemplate', async (out) => {
            await signIn(page, `${X}jm`);
            const manage = new ManageEmailsPage(page, X);
            await manage.goto();
            let opened = await manage.openEmail('Statistics Report Notification');
            if (opened.kind === 'several') {
                const rows = await manage.templateRowsRead(opened.window);
                await manage.openTemplate(opened.window, rows[0].name);
            }
            const original = await manage.subjectBox().inputValue();
            out.original = original;
            // left once with a change and without "Save"
            const dialogs = [];
            const onDialog = async (d) => {
                dialogs.push({type: d.type(), message: d.message()});
                await (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {});
            };
            page.on('dialog', onDialog);
            await manage.subjectBox().fill(`K5DRAFT ${original}`);
            await manage.templateWindow().getByRole('button', {name: 'Close', exact: true}).first().click();
            await sleep(1200);
            const left = await snap('x-template-left-unsaved');
            out.leftUnsaved = {dialogs: [...dialogs], dialogsOpen: left.aria.dialogs.length, dialogText: flat(left.text.dialog, 300)};
            await manage.goto();
            out.leftUnsaved.dialogsOnLeave = [...dialogs];
            page.off('dialog', onDialog);
            opened = await manage.openEmail('Statistics Report Notification');
            if (opened.kind === 'several') {
                const rows = await manage.templateRowsRead(opened.window);
                await manage.openTemplate(opened.window, rows[0].name);
            }
            out.reopened = await manage.subjectBox().inputValue();
            await manage.subjectBox().fill(`K5EDIT ${original}`);
            const saved = await manage.pressTemplateSave();
            out.saveStatus = saved.status;
            out.sawSaved = await saved.sawSaved();
            await sleep(1500);
            await snap('x-template-saved');
            await signOut(page);
            return out;
        });

        await block('run2', async () => app.api.runTask({task: 'statisticsReport', context: X}));
        await sleep(1500);
        await block('mail2', async (out) => {
            for (const k of ['jm', 'j2', 'se', 'sn', 'so']) {
                const box = await mailbox(app, `${X}${k}-${A}@mail.test`);
                out[k] = {count: box.length, subjects: box.map((m) => m.subject)};
            }
            await signIn(page, `${X}j2`);
            await go(`/index.php/${X}/submissions`);
            const panel = new TasksPanel(page);
            await panel.open();
            out.j2Tasks = await panel.rowTexts();
            await snap('x-j2-tasks-after-run2');
            await panel.close();
            await signOut(page);
            return out;
        });

        // ------------------------------------------------ Y: the journal off
        await block('Y', async (out) => {
            const y = (k) => `${Yc}${k}`;
            await signIn(page, y('se'));
            out.seRowOn = await notifRow(Yc);
            // line 43: the sub-editor and the Settings pages
            await go(`/index.php/${Yc}/management/settings/workflow`);
            out.seSettings = await classify();
            await snap('y-se-settings');
            await signIn(page, y('jm'));
            const emails = new WorkflowEmailsSettingsPage(page, Yc);
            await emails.goto();
            const group = page.getByRole('group', {name: 'Editorial statistics'});
            // left once with the choice changed and not saved
            await group.getByRole('radio', {name: 'Do not send the email to editors.'}).check();
            await emails.tab('Submission').click().catch(() => {});
            await sleep(800);
            await snap('y-emails-left-tab');
            await emails.openTab();
            out.leftTabRadio = await group.getByRole('radio', {name: 'Do not send the email to editors.'}).isChecked();
            await go(`/index.php/${Yc}/management/settings/workflow`);
            await emails.openTab();
            out.afterReloadUnsaved = await group.getByRole('radio', {name: 'Do not send the email to editors.'}).isChecked();
            // now saved
            await group.getByRole('radio', {name: 'Do not send the email to editors.'}).check();
            await emails.save();
            out.samePageOff = await group.getByRole('radio', {name: 'Do not send the email to editors.'}).isChecked();
            await snap('y-emails-off-saved');
            await go(`/index.php/${Yc}/management/settings/workflow`);
            await emails.openTab();
            out.reloadOff = await group.getByRole('radio', {name: 'Do not send the email to editors.'}).isChecked();
            // the sub-editor's tab without the row, saved as it is (harness lead)
            await signIn(page, y('se'));
            const off = await notifRow(Yc);
            out.seRowOff = {present: off.present, table: off.table};
            await snap('y-se-notif-off');
            const profile = new ProfilePage(page, Yc);
            await profile.save();
            await signIn(page, y('s2'));
            out.s2RowOff = (await notifRow(Yc)).present;
            out.run = await app.api.runTask({task: 'statisticsReport', context: Yc});
            await sleep(1200);
            out.mailOff = {};
            for (const k of ['jm', 'se', 's2']) {
                out.mailOff[k] = (await mailbox(app, `${y(k)}-${A}@mail.test`)).length;
            }
            out.adminOff = (await mailbox(app, 'admin@mail.test')).filter((m) => (m.text || '').includes(`/${Yc}/`)).length;
            await signIn(page, y('jm'));
            await go(`/index.php/${Yc}/submissions`);
            const panel = new TasksPanel(page);
            await panel.open();
            out.jmTasksOff = await panel.rowTexts();
            await snap('y-jm-tasks-off');
            await panel.close();
            // back on
            await emails.goto();
            await group.getByRole('radio', {name: 'Send a monthly email to editors.'}).check();
            await emails.save();
            await signIn(page, y('se'));
            const back = await notifRow(Yc);
            out.seRowBackOn = {present: back.present, allow: back.allow, email: back.email};
            await snap('y-se-notif-back-on');
            await signIn(page, y('s2'));
            const back2 = await notifRow(Yc);
            out.s2RowBackOn = {present: back2.present, allow: back2.allow, email: back2.email};
            out.runOn = await app.api.runTask({task: 'statisticsReport', context: Yc});
            await sleep(1500);
            out.mailOn = {};
            for (const k of ['jm', 'se', 's2', 'au']) {
                const box = await mailbox(app, `${y(k)}-${A}@mail.test`);
                out.mailOn[k] = {count: box.length};
                if (k === 'jm' && box[0]) {
                    out.mailOn.jmFirst = brief(box[0]);
                }
            }
            await signIn(page, y('jm'));
            await go(`/index.php/${Yc}/stats/editorial`);
            await sleep(800);
            const ea = await snap('y-ea');
            out.ea = flat(ea.text.main, 400);
            await panel.open();
            out.jmTasksOn = await panel.rowTexts();
            await panel.close();
            await signOut(page);
            // the installation's active submissions, for the attachment's first block
            out.installActive = psql(app, `select stage_id, count(*) from submissions where status=1 and submission_progress='' group by 1 order by 1`);
            out.ctxActive = psql(app, `select s.stage_id, count(*) from submissions s where s.status=1 and s.submission_progress='' and s.context_id=${R.seedX.contextId} group by 1 order by 1`);
            return out;
        });

        // ------------------------------------ Z: French primary language
        await block('Z', async () => {
            const z = mk(Z);
            await app.api.createContext({tag: Z, context: {primaryLocale: 'fr_CA', supportedLocales: ['en', 'fr_CA']}, users: [z('jm', ['manager'])]});
            const run = await app.api.runTask({task: 'statisticsReport', context: Z});
            await sleep(1200);
            const box = await mailbox(app, `${Z}jm-${A}@mail.test`);
            return {run: {mailed: run.mailed, dateStart: run.dateStart}, count: box.length, first: box[0] && {subject: box[0].subject, text: flat(box[0].text, 900), attachment: box[0].attachments.map((a) => ({name: a.name, head: a.text.slice(0, 200)}))}};
        });

        // ---- Z2: the same French-primary journal run the command line's way
        // (the scheduler's run has no browser request behind it: which
        // language and which links does it give?).
        await block('Zcli', async (out) => {
            const Z2 = tag('u65k5v');
            const z = mk(Z2);
            await app.api.createContext({tag: Z2, context: {primaryLocale: 'fr_CA', supportedLocales: ['en', 'fr_CA']}, users: [z('jm', ['manager'])]});
            const env = envFile(app);
            const appRoot = path.join(REPO, 'checkouts', A);
            const run = (args) => execFileSync('php', args, {cwd: appRoot, env: {...process.env, PKP_CONFIG_FILE: env.PKP_CONFIG_FILE}, encoding: 'utf8'});
            out.cli = JSON.parse(run([path.join(__dirname, 'cli-statsreport.php'), appRoot, Z2]).trim().split('\n').pop());
            out.jobsRun = run(['lib/pkp/tools/jobs.php', 'run']).trim().slice(-160);
            await sleep(1200);
            const box = await mailbox(app, `${Z2}jm-${A}@mail.test`);
            out.count = box.length;
            out.first = box[0] && {subject: box[0].subject, text: flat(box[0].text, 700), links: anchors(box[0].html).map((l) => l.href), attachment: box[0].attachments.map((a) => a.text.slice(0, 160))};
            return out;
        });

        // ------------------------- W: the jobs on Administration › View Jobs
        await block('W', async (out) => {
            const w = mk(W);
            await app.api.createContext({tag: W, users: [w('jm', ['manager']), w('se', ['sectionEditor']), w('sd', ['sectionEditor'], {disabled: true})]});
            const env = envFile(app);
            const appRoot = path.join(REPO, 'checkouts', A);
            // the fleet's own waiting jobs first, so the page lists the report's
            out.drainedBefore = execFileSync('php', ['lib/pkp/tools/jobs.php', 'run'], {cwd: appRoot, env: {...process.env, PKP_CONFIG_FILE: env.PKP_CONFIG_FILE}, encoding: 'utf8'}).trim().slice(-200);
            out.queuedBefore = psql(app, `select queue, count(*) from jobs group by 1 order by 1`);
            const cli = execFileSync('php', [path.join(__dirname, 'cli-statsreport.php'), appRoot, W], {cwd: appRoot, env: {...process.env, PKP_CONFIG_FILE: env.PKP_CONFIG_FILE}, encoding: 'utf8'});
            out.cli = JSON.parse(cli.trim().split('\n').pop());
            out.queuedAfter = psql(app, `select queue, count(*) from jobs group by 1 order by 1`);
            await signIn(page, 'admin');
            await go('/index.php/index/admin/jobs');
            await sleep(800);
            const j = await snap('w-admin-jobs');
            out.jobsPage = flat(j.text.main, 1500);
            out.jobsRun = execFileSync('php', ['lib/pkp/tools/jobs.php', 'run'], {cwd: appRoot, env: {...process.env, PKP_CONFIG_FILE: env.PKP_CONFIG_FILE}, encoding: 'utf8'}).trim().slice(-400);
            out.queuedEnd = psql(app, `select queue, count(*) from jobs group by 1 order by 1`);
            await sleep(1000);
            out.mail = {};
            for (const k of ['jm', 'se', 'sd']) {
                out.mail[k] = (await mailbox(app, `${W}${k}-${A}@mail.test`)).map((m) => ({subject: m.subject, links: anchors(m.html).map((l) => l.href)}));
            }
            out.notifRows = psql(app, `select u.username, n.level from notifications n join users u on u.user_id=n.user_id where u.username like '${W}%' and n.type=16777258 order by 1,2`);
            await signOut(page);
            return out;
        });

        // ------------- Actors rows 41, 43, 44: one account per permission level
        await block('access', async (out) => {
            const who = ['jm', 'au', 'rd', 'se'];
            if (A !== 'ops') {
                who.push('ed', 'pe', 'rv', 'cp');
            } else {
                who.push('eb');
            }
            if (A === 'ojs') {
                who.push('sm');
            }
            if (A === 'omp') {
                who.push('ve');
            }
            for (const k of [...who, 'admin', null]) {
                const e = {};
                if (k === 'admin') {
                    await signIn(page, 'admin');
                } else if (k) {
                    await signIn(page, `${X}${k}`);
                } else {
                    await signOut(page);
                }
                const tagName = k || 'out';
                if (k !== 'se') {
                    await go(`/index.php/${X}/stats/reports`);
                    e.reports = await classify();
                    if (['jm', 'au', null].includes(k)) {
                        await snap(`acc-${tagName}-reports`);
                    }
                }
                await go(`/index.php/${X}/management/settings/workflow`);
                e.settings = await classify();
                e.settings.editorialStatistics = (await page.getByRole('group', {name: 'Editorial statistics'}).count()) > 0;
                if (k) {
                    e.nav = await sideNavLinks();
                    const row = await notifRow(X).catch((err) => ({error: err.message.slice(0, 120)}));
                    e.profileRow = {present: row.present, groups: row.table && row.table.map((g) => g.group)};
                    if (['jm', 'au', 'rd', 'se'].includes(k)) {
                        await snap(`acc-${tagName}-notif`);
                    }
                }
                out[tagName] = e;
            }
            await signOut(page);
            return out;
        });

        // ---------- Side effects (lines 434–438) and the "Report Plugins" rows
        // As X's Journal Manager: a range, a filter, the "Export" window left
        // and reopened, the export and one report downloaded; every non-GET
        // request the pages send, and X's rows before and after.
        await block('sideEffects', async (out) => {
            const T = {ojs: ['journals', 'journal_settings', 'journal_id'], omp: ['presses', 'press_settings', 'press_id'], ops: ['servers', 'server_settings', 'server_id']}[A];
            const cid = R.seedX.contextId;
            const counts = () => psql(app, `select
                (select count(*) from notifications where context_id=${cid}),
                (select count(*) from notification_subscription_settings where context_id=${cid}),
                (select count(*) from ${T[1]} where ${T[2]}=${cid}),
                (select count(*) from plugin_settings where context_id=${cid}),
                (select count(*) from email_log_users l join users u on u.user_id=l.user_id where u.username like '${X}%'),
                (select count(*) from event_log e join submissions s on s.submission_id=e.assoc_id and e.assoc_type=1048585 where s.context_id=${cid}),
                (select count(*) from user_settings us join users u on u.user_id=us.user_id where u.username like '${X}%')`)[0];
            out.countsHead = ['notifications', 'notification_subscription_settings', 'context settings', 'plugin_settings', 'email_log_users', 'submission event_log', 'user_settings'];
            const writes = [];
            const onReq = (r) => {
                if (r.method() !== 'GET' && r.url().startsWith(app.baseURL)) {
                    writes.push(`${r.method()} ${r.url().replace(app.baseURL, '').replace(/csrfToken=[^&]+/, '')}`);
                }
            };
            await signIn(page, `${X}jm`);
            out.before = counts();
            out.mailBefore = (await mailbox(app, `${X}jm-${A}@mail.test`)).length;
            page.on('request', onReq);
            try {
                await go(`/index.php/${X}/stats/editorial`);
                await page.getByRole('button', {name: 'Change date range'}).click();
                await page.locator('.pkpDateRange__option').first().click();
                await sleep(1200);
                await idle(page);
                const filters = page.getByRole('button', {name: 'Filters', exact: true});
                out.filtersButton = await filters.count();
                if (out.filtersButton) {
                    await filters.first().click();
                    await sleep(500);
                    const f = await snap('se-filters-open');
                    out.filtersPanel = flat(f.text.main, 600);
                    const firstFilter = page.getByRole('button', {name: A === 'ops' ? 'Preprints' : 'Articles', exact: true}).first();
                    if (await firstFilter.count()) {
                        await firstFilter.click();
                        await sleep(1200);
                        await idle(page);
                        out.filtered = flat((await snap('se-filtered')).text.main, 900);
                    }
                }
                // "Users" › "Export": left once with a box unticked
                await go(`/index.php/${X}/stats/users`);
                await page.getByRole('button', {name: 'Export', exact: true}).click();
                const dlg = page.getByRole('dialog').last();
                await dlg.waitFor();
                await idle(page);
                const boxes = dlg.locator('input[type="checkbox"]');
                out.exportBoxes = await boxes.evaluateAll((bs) => bs.map((b) => [((b.closest('label') || {}).textContent || '').trim(), b.checked]));
                await boxes.first().uncheck();
                out.exportAfterUntick = await boxes.evaluateAll((bs) => bs.map((b) => b.checked));
                await snap('se-export-unticked');
                await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
                await sleep(800);
                await page.getByRole('button', {name: 'Export', exact: true}).click();
                await page.getByRole('dialog').last().waitFor();
                await sleep(500);
                out.exportReopenedSamePage = await page.getByRole('dialog').last().locator('input[type="checkbox"]').evaluateAll((bs) => bs.map((b) => b.checked));
                await go(`/index.php/${X}/stats/editorial`);
                await go(`/index.php/${X}/stats/users`);
                await page.getByRole('button', {name: 'Export', exact: true}).click();
                const dlg2 = page.getByRole('dialog').last();
                await dlg2.waitFor();
                await sleep(500);
                out.exportAfterLeaving = await dlg2.locator('input[type="checkbox"]').evaluateAll((bs) => bs.map((b) => b.checked));
                await snap('se-export-after-leaving');
                const dl = page.waitForEvent('download', {timeout: 30_000});
                await dlg2.getByRole('button', {name: 'Export', exact: true}).click();
                out.exportFile = (await dl).suggestedFilename();
                // one report
                if (A !== 'ops') {
                    await go(`/index.php/${X}/stats/reports`);
                    const name = A === 'ojs' ? 'Articles Report' : 'Monograph Report';
                    const d2 = page.waitForEvent('download', {timeout: 30_000});
                    await page.getByRole('link', {name, exact: true}).click();
                    out.reportFile = (await d2).suggestedFilename();
                }
            } finally {
                page.off('request', onReq);
            }
            await sleep(1500);
            out.writes = writes;
            out.after = counts();
            out.mailAfter = (await mailbox(app, `${X}jm-${A}@mail.test`)).length;
            // Settings › Website › Plugins: the "Report Plugins" rows
            await go(`/index.php/${X}/management/settings/website`);
            await page.locator('#plugins-button').click().catch(() => {});
            await sleep(1500);
            await idle(page);
            const grid = page.locator('[id^="component-grid-settings-plugins-settingsplugingrid"]').first();
            out.pluginsText = flat(await grid.innerText().catch(() => ''), 6000).match(/Report Plugins.*?(?=(Themes|Generic Plugins|Public Identifier Plugins|Metadata Plugins|Block Plugins|Gateway Plugins|Import\/Export Plugins|Payment Methods|$))/)?.[0] || null;
            out.reportLinks = await page.locator('a').evaluateAll((as) => as.filter((a) => /stats\/reports\/report/.test(a.getAttribute('href') || '')).map((a) => [a.textContent.replace(/\s+/g, ' ').trim(), a.getAttribute('href').replace(/^.*index\.php/, '')]));
            await snap('se-plugins');
            await signOut(page);
            return out;
        });
    } finally {
        save();
        await close();
    }
});
