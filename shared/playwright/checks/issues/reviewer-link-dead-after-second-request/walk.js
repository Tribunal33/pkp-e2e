// Kept walk for docs/issues/U28-A9-reviewer-link-dead-after-second-request.md (spec U28, register A9).
// On PKP's default test dataset (a dataset fleet), journal and press: dbarnes turns "One-click
// Reviewer Access" on, asks one reviewer to review a submission, then asks the same reviewer on a
// second submission; the FIRST request email's link is opened signed out before and after. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u28g node bin/probe.js all \
//     shared/playwright/checks/issues/reviewer-link-dead-after-second-request/walk.js
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: a reminder for the SAME review
// still replaces that review's request link, and the reminder's own link opens the wizard.
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    /** One step, recorded; a failure is recorded, never thrown, so the walk goes on. */
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: L.flat(e.message, 400)};
            note(`U28 A9 walk 1 (${app.name}): step ${key} failed: ${L.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const ed = await launch(app);
    const page = ed.page;
    await signIn(page, 'dbarnes');
    await step('s0-setting', () => L.enableOneClick(page, app));

    if (MODE === 'neighbour') {
        const r = c.reminded;
        const since = new Date();
        await step('n1-add', async () => L.addReviewer(page, await L.openWorkflow(page, app, c.b), r.name));
        const request = await step('n1-request-mail', () => L.waitMail(app, L.mailOf(r.username), since, L.REQUEST));
        const over = await step('n2-overdue', async () => (await L.makeResponseOverdue(page, app, c.b, r.name)).row);
        if (!over.error) {
            await step('n3-reminder-sent', async () => L.reminderWindow(page, await L.openWorkflow(page, app, c.b), r.name, {send: true}));
            const reminder = await step('n3-reminder-mail', () => L.waitMail(app, L.mailOf(r.username), since, L.REMINDER));
            if (reminder.link) await step('n4-reminder-link', () => L.openSignedOut(app, 'n4-reminder-link', reminder.link));
            if (request.link) await step('n5-request-link', () => L.openSignedOut(app, 'n5-request-link', request.link));
        }
        facts.invitations = L.accessInvitations(app, r.username);
        record('summary', facts);
        return;
    }

    const r = c.reviewer;
    const since = new Date();
    await step('s1-add-first', async () => L.addReviewer(page, await L.openWorkflow(page, app, c.a), r.name));
    const m1 = await step('s1-mail', () => L.waitMail(app, L.mailOf(r.username), since, L.REQUEST));
    if (m1.link) await step('s2-first-link-before', () => L.openSignedOut(app, 's2-first-link-before', m1.link));
    facts['invitations-after-first'] = L.accessInvitations(app, r.username);
    const since2 = new Date();
    await step('s3-add-second', async () => L.addReviewer(page, await L.openWorkflow(page, app, c.b), r.name));
    const m2 = await step('s3-mail', () => L.waitMail(app, L.mailOf(r.username), since2, L.REQUEST));
    facts['invitations-after-second'] = L.accessInvitations(app, r.username);
    if (m1.link) await step('s4-first-link-after', () => L.openSignedOut(app, 's4-first-link-after', m1.link));
    if (m2.link) await step('s5-second-link', () => L.openSignedOut(app, 's5-second-link', m2.link));
    record('summary', facts);
});
