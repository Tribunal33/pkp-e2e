// Helpers of walk.js (issue report docs/issues/U65-A14-stats-email-optout-after-saving-notifications.md).
// Requiring this file runs nothing. The screen helpers drive what a person uses; runTask() and
// runJobs() run the scheduler's and the job runner's own commands in the app root, mailbox() reads
// the slot's Mailpit (taken over from the U65 A9 walk's lib, deleted when A9 was fixed upstream).
const path = require('path');
const {execFileSync} = require('child_process');
const {idle, sql} = require('../../../probe');
const ctxLib = require('../all-dates-error-nothing-published/lib.js');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const ON = 'Send a monthly email to editors.';
const OFF = 'Do not send the email to editors.';
const ROW = 'Statistics report summary.';
const REMINDER = 'Weekly email of outstanding tasks';
// Notification::NOTIFICATION_TYPE_EDITORIAL_REPORT and _EDITORIAL_REMINDER
const TYPE = {report: 0x100002a, reminder: 0x100002c};

function php(app, args) {
    const command = `php ${args.map((a) => (/[\\\s]/.test(a) ? `'${a}'` : a)).join(' ')}`;
    try {
        const out = execFileSync('php', args, {
            cwd: path.resolve(REPO, app.root),
            env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)},
            encoding: 'utf8',
            timeout: 300_000,
        });
        return {command, status: 0, out: flat(out, 1500)};
    } catch (e) {
        return {command, status: e.status, out: flat(`${e.stdout || ''} ${e.stderr || ''}`, 1500)};
    }
}

/** The monthly task, run now as the site's scheduler runs it on the 1st. */
function runTask(app) {
    return php(app, ['lib/pkp/tools/scheduler.php', 'test', '--name=PKP\\task\\StatisticsReport']);
}

/** The waiting jobs, run from the command line. */
function runJobs(app) {
    return php(app, ['lib/pkp/tools/jobs.php', 'run']);
}

/** The messages to `to` received since `since`, newest first, with their attachments' text. */
async function mailbox(app, to, since) {
    const base = app.mail.url;
    const res = await (await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=50`)).json();
    const from = new Date(since).getTime();
    const out = [];
    for (const m of res.messages || []) {
        if (new Date(m.Created).getTime() < from) continue;
        const full = await (await fetch(`${base}/api/v1/message/${m.ID}`)).json();
        const attachments = [];
        for (const a of full.Attachments || []) {
            const buf = Buffer.from(await (await fetch(`${base}/api/v1/message/${m.ID}/part/${a.PartID}`)).arrayBuffer());
            attachments.push({name: a.FileName, bom: buf.subarray(0, 3).toString('hex') === 'efbbbf', text: buf.toString('utf8').replace(/^﻿/, '')});
        }
        out.push({created: m.Created, subject: full.Subject, from: (full.From || {}).Address, text: flat(full.Text, 900), attachments});
    }
    return out;
}

/** Settings › Workflow › "Emails": choose `choice` under "Editorial statistics" and press "Save". */
async function setStatsEmail(page, ctx, choice) {
    const {WorkflowEmailsSettingsPage} = require(path.join(REPO, 'shared/playwright/pages/EmailsPages.js'));
    const emails = new WorkflowEmailsSettingsPage(page, ctx);
    await emails.goto();
    const group = page.getByRole('group', {name: 'Editorial statistics'});
    await group.getByRole('radio', {name: choice, exact: true}).check();
    let saved = null;
    try {
        await emails.save();
        saved = true;
    } catch (e) {
        saved = flat(e.message, 300);
    }
    // what the tab holds after a reload
    await emails.goto();
    const radios = await group.getByRole('radio').evaluateAll((rs) =>
        rs.map((r) => [((r.closest('label') || {}).textContent || '').replace(/\s+/g, ' ').trim(), r.checked])
    );
    return {saved, radios};
}

/**
 * Profile › "Notifications" of `ctx` (`null`: the site-level profile, `index`): the groups and rows,
 * and the two boxes of the rows named in `rows` (by setting name), or null where a row is absent.
 */
async function notifTab(page, ctx) {
    const {ProfilePage} = require(path.join(REPO, 'shared/playwright/pages/ProfilePage.js'));
    const profile = new ProfilePage(page, ctx);
    await profile.goto('notifications');
    await idle(page);
    const out = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), table: await profile.notificationTable()};
    for (const [key, name] of [['report', 'notificationEditorialReport'], ['reminder', 'notificationEditorialReminder']]) {
        const pair = profile.notificationPair(name);
        out[key] = (await pair.allow.count())
            ? {allow: await pair.allow.isChecked(), email: await pair.email.isChecked(), emailDisabled: await pair.email.isDisabled()}
            : null;
    }
    return {profile, out};
}

/** Press "Save" on the open Notifications tab: the toast's text. */
async function saveNotifTab(page, profile) {
    await profile.save();
    const toast = await profile.toast.first().innerText({timeout: 10_000}).catch(() => null);
    return {toast: flat(toast, 120)};
}

/** Untick (or tick) a row's "Enable these types of notifications." on the open tab. */
async function setAllow(profile, settingName, value) {
    const pair = profile.notificationPair(settingName);
    await pair.allow.setChecked(value);
}

/** The "Tasks" panel of the signed-in user on `ctx`'s editorial pages: the bell and the rows. */
async function tasks(page, app, ctx) {
    const {TasksPanel} = require(path.join(REPO, 'shared/playwright/pages/NotificationsPages.js'));
    await page.goto(app.url(`/index.php/${ctx}/en/submissions`));
    await idle(page);
    const panel = new TasksPanel(page);
    await panel.bell().first().waitFor({state: 'visible', timeout: T});
    const out = {bell: flat(await panel.bell().first().innerText(), 40)};
    await panel.open();
    out.rows = await panel.rowTexts();
    out.statsEntries = out.rows.filter((r) => /kind reminder|Statistics report summary/.test(r)).length;
    await panel.close().catch(() => {});
    return out;
}

/** The stored subscription rows of `username` (read only, for Evidence). */
async function stored(app, username) {
    return sql(
        app,
        `SELECT n.setting_name, n.setting_value, COALESCE(n.context_id::text, 'NULL') FROM notification_subscription_settings n JOIN users u ON u.user_id = n.user_id WHERE u.username = '${username}' AND n.setting_value IN ('${TYPE.report}', '${TYPE.reminder}') ORDER BY 1, 2, 3`
    );
}

/** The monthly emails to `to` since `since` (subject and sender), waiting up to `ms` for `n`. */
async function statsMail(app, to, since, n = 1, ms = 30_000) {
    const end = Date.now() + ms;
    for (;;) {
        const box = (await mailbox(app, to, since)).filter((m) => /activity for/i.test(m.subject || ''));
        // every fleet of the slot mails one Mailpit: `fleet` says whether the email links to this fleet
        const host = new URL(app.baseURL).host;
        if (box.length >= n || Date.now() > end) return box.map((m) => ({subject: m.subject, from: m.from, fleet: String(m.text || '').includes(host)}));
        await sleep(1500);
    }
}

module.exports = {T, sleep, flat, ON, OFF, ROW, REMINDER, TYPE, setStatsEmail, notifTab, saveNotifTab, setAllow, tasks, stored, statsMail, runTask, runJobs, mailbox, createContext: ctxLib.createContext, WORDS: ctxLib.WORDS};
