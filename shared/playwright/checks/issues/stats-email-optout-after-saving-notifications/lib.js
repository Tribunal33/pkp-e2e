// Helpers of walk.js (issue report docs/issues/U65-A14-stats-email-optout-after-saving-notifications.md).
// Requiring this file runs nothing. The screen helpers drive what a person uses; runTask(), runJobs()
// and mailbox() come from the U65 A9 walk's lib (the scheduler's and the job runner's own commands,
// run in the app root, and the slot's Mailpit).
const path = require('path');
const {idle, sql} = require('../../../probe');
const a9 = require('../monthly-report-counts-other-journals/lib.js');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const {sleep, flat} = a9;
const ON = 'Send a monthly email to editors.';
const OFF = 'Do not send the email to editors.';
const ROW = 'Statistics report summary.';
const REMINDER = 'Weekly email of outstanding tasks';
// Notification::NOTIFICATION_TYPE_EDITORIAL_REPORT and _EDITORIAL_REMINDER
const TYPE = {report: 0x100002a, reminder: 0x100002c};

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
        const box = (await a9.mailbox(app, to, since)).filter((m) => /activity for/i.test(m.subject || ''));
        // every fleet of the slot mails one Mailpit: `fleet` says whether the email links to this fleet
        const host = new URL(app.baseURL).host;
        if (box.length >= n || Date.now() > end) return box.map((m) => ({subject: m.subject, from: m.from, fleet: String(m.text || '').includes(host)}));
        await sleep(1500);
    }
}

module.exports = {T, sleep, flat, ON, OFF, ROW, REMINDER, TYPE, setStatsEmail, notifTab, saveNotifTab, setAllow, tasks, stored, statsMail, runTask: a9.runTask, runJobs: a9.runJobs, createContext: a9.createContext, WORDS: a9.WORDS};
