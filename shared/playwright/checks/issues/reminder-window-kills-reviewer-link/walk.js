// Kept walk for docs/issues/U28-A9-reminder-window-kills-reviewer-link.md (spec U28, register A9);
// its steps 6-7 are also the reviewer-link reach of docs/issues/U06-A3-replaced-invitation-links-not-found.md.
// On PKP's default test dataset (a dataset fleet), journal and press: dbarnes turns "One-click
// Reviewer Access" on, asks a reviewer, makes the response overdue, then opens the row's "Send
// Reminder" window and presses "Cancel"; the request email's link is opened signed out before and
// after. Then the reminder is sent, and both emails' links are opened. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u28g node bin/probe.js all \
//     shared/playwright/checks/issues/reminder-window-kills-reviewer-link/walk.js
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: with the setting left off, the
// request and the reminder carry the plain wizard address, which asks a signed-out browser to sign in.
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const L = require('../reviewer-link-dead-after-second-request/lib.js');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const r = c.reminded;
    const to = L.mailOf(r.username);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    /** One step, recorded; a failure is recorded, never thrown, so the walk goes on. */
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: L.flat(e.message, 400)};
            note(`U28 A9 walk 2 (${app.name}): step ${key} failed: ${L.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const ed = await launch(app);
    const page = ed.page;
    await signIn(page, 'dbarnes');
    const since = new Date();

    if (MODE === 'neighbour') {
        await step('n1-add', async () => L.addReviewer(page, await L.openWorkflow(page, app, c.b), r.name));
        const request = await step('n1-request-mail', () => L.waitMail(app, to, since, L.REQUEST));
        const over = await step('n2-overdue', async () => (await L.makeResponseOverdue(page, app, c.b, r.name)).row);
        if (!over.error) {
            await step('n3-reminder-sent', async () => L.reminderWindow(page, await L.openWorkflow(page, app, c.b), r.name, {send: true}));
            const reminder = await step('n3-reminder-mail', () => L.waitMail(app, to, since, L.REMINDER));
            if (request.link) await step('n4-request-link', () => L.openSignedOut(app, 'n4-request-link', request.link));
            if (reminder.link) await step('n5-reminder-link', () => L.openSignedOut(app, 'n5-reminder-link', reminder.link));
        }
        facts.invitations = L.accessInvitations(app, r.username);
        record('summary', facts);
        return;
    }

    await step('s0-setting', () => L.enableOneClick(page, app));
    await step('s1-add', async () => L.addReviewer(page, await L.openWorkflow(page, app, c.b), r.name));
    const request = await step('s1-mail', () => L.waitMail(app, to, since, L.REQUEST));
    const over = await step('s2-overdue', async () => (await L.makeResponseOverdue(page, app, c.b, r.name)).row);
    if (request.link) await step('s3-request-link-before', () => L.openSignedOut(app, 's3-request-link-before', request.link));
    facts['invitations-before-window'] = L.accessInvitations(app, r.username);
    if (!over.error) {
        await step('s4-window-cancelled', async () => L.reminderWindow(page, await L.openWorkflow(page, app, c.b), r.name, {send: false, label: 's4-reminder-window'}));
        facts['invitations-after-cancel'] = L.accessInvitations(app, r.username);
        await L.sleep(1500);
        await step('s5-mails-after-cancel', () => L.mailsTo(app, to, since));
        if (request.link) await step('s5-request-link-after-cancel', () => L.openSignedOut(app, 's5-request-link-after-cancel', request.link));
        await step('s6-reminder-sent', async () => L.reminderWindow(page, await L.openWorkflow(page, app, c.b), r.name, {send: true}));
        const reminder = await step('s6-reminder-mail', () => L.waitMail(app, to, since, L.REMINDER));
        facts['invitations-after-send'] = L.accessInvitations(app, r.username);
        if (reminder.link) await step('s7-reminder-link', () => L.openSignedOut(app, 's7-reminder-link', reminder.link));
        if (request.link) await step('s7-request-link-after-send', () => L.openSignedOut(app, 's7-request-link-after-send', request.link));
    }
    record('summary', facts);
});
