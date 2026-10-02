// Kept walk for docs/issues/U06-A3-replaced-invitation-links-not-found.md (spec U06, register A3).
// On PKP's default test dataset (a dataset fleet): rvaca sends an invitation and then replaces it,
// once through the Invitations row's "Edit" and once by a plain second send to the same person;
// each time the FIRST email's links are opened signed out, then the second's. Control: a cancelled
// invitation's link. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u06c node bin/probe.js all \
//     shared/playwright/checks/issues/replaced-invitation-links-not-found/walk.js
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: a send to another person leaves
// the first person's invitation working, and a link with its key altered still answers not found.
const {forEachApp, launch, signIn, record, shot, note} = require('../../../probe');
const {sendInvitation, viewAllUsers, invitationMail} = require('../invitation-sent-promises-decision-updates/lib.js');
const {CASES, mailOf, flat, editInvitation, cancelInvitation, openLink, tamper} = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';

/** One step, recorded; a failure is recorded, never thrown, so the walk goes on. */
async function step(facts, key, fn) {
    try {
        facts[key] = await fn();
    } catch (e) {
        facts[key] = {error: flat(e.message, 400)};
        note(`U06 A3 walk: step ${key} failed: ${flat(e.message, 200)}`);
    }
    return facts[key];
}

/** A link's outcome without the bulky screen, for the summary. */
const brief = (r) => r && !r.error ? {status: r.status, title: r.title, headings: r.headings, acceptWizard: r.acceptWizard,
    declinePage: r.declinePage, unavailable: r.unavailable, buttons: r.buttons, links: r.links, stylesheets: r.stylesheets,
    body: flat(r.body, 300)} : r;

forEachApp(async (app) => {
    const c = CASES[app.name];
    const mgr = await launch(app);
    const rcpt = await launch(app); // the recipient's browser, never signed in
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const send = async (key, username, role) => {
        const since = new Date();
        const s = await sendInvitation(mgr.page, app, {email: mailOf(username), role});
        await viewAllUsers(mgr.page);
        const mail = await invitationMail(app, mailOf(username), since);
        return {sent: s.text, mail};
    };
    const open = async (key, link) => {
        const r = await openLink(rcpt.page, link);
        record(key, r);
        await shot(rcpt.page, key);
        return brief(r);
    };
    await signIn(mgr.page, 'rvaca');

    if (MODE === 'neighbour') {
        const n = c.neighbour;
        const first = await step(facts, 'n1-send-first', () => send('n1', n.first, c.role));
        await step(facts, 'n2-send-second-person', () => send('n2', n.second, c.role));
        if (first.mail) {
            await step(facts, 'n3-first-person-accept', () => open('n3-first-person-accept', first.mail.accept));
            await step(facts, 'n4-tampered-accept', () => open('n4-tampered-accept', tamper(first.mail.accept)));
        }
        record('summary', facts);
        return;
    }

    // Editing
    const e1 = await step(facts, 's01-send', () => send('s01', c.edited, c.role));
    const e2 = await step(facts, 's02-edit', async () => {
        const since = new Date();
        const ed = await editInvitation(mgr.page, app, mailOf(c.edited), c.editedRole);
        await viewAllUsers(mgr.page);
        return {...ed, mail: await invitationMail(app, mailOf(c.edited), since)};
    });
    if (e1.mail) {
        await step(facts, 's03-edited-first-accept', () => open('s03-edited-first-accept', e1.mail.accept));
        await step(facts, 's04-edited-first-decline', () => open('s04-edited-first-decline', e1.mail.decline));
    }
    if (e2.mail) await step(facts, 's05-edited-second-accept', () => open('s05-edited-second-accept', e2.mail.accept));

    // Re-sending
    const r1 = await step(facts, 's06-send', () => send('s06', c.resent, c.role));
    const r2 = await step(facts, 's07-send-again', () => send('s07', c.resent, c.role));
    if (r1.mail) await step(facts, 's08-resent-first-accept', () => open('s08-resent-first-accept', r1.mail.accept));
    if (r2.mail) await step(facts, 's09-resent-second-accept', () => open('s09-resent-second-accept', r2.mail.accept));

    // Control: cancelling
    const k1 = await step(facts, 's10-send', () => send('s10', c.cancelled, c.role));
    await step(facts, 's11-cancel', () => cancelInvitation(mgr.page, app, mailOf(c.cancelled)));
    if (k1.mail) await step(facts, 's12-cancelled-accept', () => open('s12-cancelled-accept', k1.mail.accept));

    record('summary', facts);
});
