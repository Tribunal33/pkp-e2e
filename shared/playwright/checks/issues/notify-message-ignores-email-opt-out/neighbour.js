// U35 A16, the neighbour check of the proposed fix (fix.diff beside this file): the two paths the fix
// must leave alone, on PKP's default dataset, the same submission and "Notify" as walk.js:
//   plain     nothing ticked or unticked on dbuskins's "Notifications" tab: the email arrives, with the
//             discussion footer and its unsubscribe link, and the "Tasks" row
//   disabled  dbuskins unticks "Enable these types of notifications." under "Discussion added.":
//             neither the email nor a new "Tasks" row
//
//   PROBE_RUN=n PROBE_FEATURE=issues-r5 PROBE_AGENT=r5 node bin/probe.js all shared/playwright/checks/issues/notify-message-ignores-email-opt-out/neighbour.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const stamp = Date.now().toString(36);
    const M = {plain: `Hello David u35r5 plain ${app.name} ${stamp}`, disabled: `Hello David u35r5 disabled ${app.name} ${stamp}`};
    const facts = {app: app.name, line: app.line || 'main', submission: w.id, markers: M};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]));
    };
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => {
        await d.accept().catch(() => {});
    });
    try {
        await signIn(page, 'dbarnes');
        await step('plainNotify', () => L.notify(page, app, w, L.RECIPIENT.name, M.plain, 'plain-notify'));
        await step('plainMail', () => L.mailbox(page, app, L.RECIPIENT.mail, M.plain, 25000));
        await signOut(page);

        await signIn(page, L.RECIPIENT.username);
        await step('plainTasks', () => L.tasks(page, app, 'plain-tasks'));
        await step('disable', () => L.setNotificationBox(page, app, 'Discussion added.', 'Enable these types of notifications.', false, 'disable'));
        await signOut(page);

        await signIn(page, 'dbarnes');
        await step('disabledNotify', () => L.notify(page, app, w, L.RECIPIENT.name, M.disabled, 'disabled-notify'));
        await step('disabledMail', () => L.mailbox(page, app, L.RECIPIENT.mail, M.disabled, 25000));
        await signOut(page);

        await signIn(page, L.RECIPIENT.username);
        await step('disabledTasks', () => L.tasks(page, app, 'disabled-tasks'));
        await signOut(page).catch(() => {});
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
