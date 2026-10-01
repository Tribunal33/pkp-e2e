// U35 A16 (issue report docs/issues/U35-A16-notify-message-ignores-email-opt-out.md): a message sent from
// "Notify" reaches the mailbox of a person who ticked "Do not send me an email for these types of
// notifications." under "Discussion added.". The steps of the report, through the screens, on PKP's
// default dataset (lib.js WORDS: OJS 4 Submission, OMP 9 Submission, OPS 1 Production):
//   optOut  as dbuskins: profile › "Notifications", "Discussion added.", the "Do not send me an email…" box ticked, "Save"
//   notify  as dbarnes: row "David Buskins" › "More Actions" › "Notify", the stage's "Discussion (…)" chosen,
//           a message typed, "Notify"
//   mail    the mailbox of dbuskins@mailinator.com, read for the typed message (up to 25 s)
//   tasks   as dbuskins: the "Tasks" window
//
//   PROBE_FEATURE=issues-r5 PROBE_AGENT=r5 node bin/probe.js all shared/playwright/checks/issues/notify-message-ignores-email-opt-out/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r5-3_5 in front.)
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const marker = `Hello David u35r5 ${app.name} ${Date.now().toString(36)}`;
    const facts = {app: app.name, line: app.line || 'main', submission: w.id, marker};
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
        await signIn(page, L.RECIPIENT.username);
        await step('optOut', () =>
            L.setNotificationBox(page, app, 'Discussion added.', 'Do not send me an email for these types of notifications.', true, 'opt-out'));
        await signOut(page);

        await signIn(page, 'dbarnes');
        await step('notify', () => L.notify(page, app, w, L.RECIPIENT.name, marker, 'notify'));
        await step('mail', () => L.mailbox(page, app, L.RECIPIENT.mail, marker, 25000));
        await signOut(page);

        await signIn(page, L.RECIPIENT.username);
        await step('tasks', () => L.tasks(page, app, 'tasks'));
        await signOut(page).catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
