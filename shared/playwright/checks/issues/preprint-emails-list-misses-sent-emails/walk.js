// Walk of U06 OPS1 (issue report docs/issues/U06-OPS1-preprint-emails-list-misses-sent-emails.md), on
// PKP's default test dataset, as rvaca (the manager): Settings › Workflow › "Emails" › "Add and edit
// templates"; search "User Invited to Role Notification" and press its "Edit" when listed; read the
// full list for the other shared emails a preprint server sends; then "Invite to a role" (ccorino as
// Moderator on OPS, Copyeditor on OJS; aclark as Copyeditor on OMP) and read the email that arrives.
// NB=1 runs the neighbour alone (no invitation): the full list, and which emails a preprint server
// never sends are on it (the fix must leave them off).
//   PROBE_FEATURE=issues-u06f PROBE_AGENT=u06f node bin/probe.js all shared/playwright/checks/issues/preprint-emails-list-misses-sent-emails/walk.js
//   PROBE_FEATURE=issues-u06f PROBE_AGENT=u06f PROBE_RUN=nb-in NB=1 node bin/probe.js ops shared/playwright/checks/issues/preprint-emails-list-misses-sent-emails/walk.js
const {forEachApp, launch, signIn, signOut, record, serverLog} = require('../../../probe');
const H = require('./lib.js');
const A5 = require('../invitation-sent-promises-decision-updates/lib.js');

const neighbour = !!process.env.NB;

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, neighbour};
    const log = serverLog(app);
    const mark = log.mark();
    const since = new Date(Date.now() - 2000);
    const name = neighbour ? 'neighbour' : 'walk';
    const save = () => record(name, facts);
    const {page, close} = await launch(app);
    try {
        // 1–2. rvaca, Manage Emails
        await signIn(page, 'rvaca');
        const {m, via} = await H.openManageEmails(page, app);
        facts.reachedVia = via;

        if (neighbour) {
            const list = await H.fullList(page, m);
            record('nb-01-full-list', list.screen);
            facts.count = list.count;
            facts.names = list.names;
            facts.neverSentListed = H.NEVER.filter((n) => list.names.includes(n));
            facts.sentListed = H.SENT.filter((n) => list.names.includes(n));
            facts.serverErrors = log.since(mark);
            save();
            return;
        }

        // 3. search the invitation email; its "Edit" when listed
        const s = await H.searchEmail(page, m, H.INVITATION);
        record('01-search-invitation', s.screen);
        if (s.editScreen) record('02-invitation-edit', s.editScreen);
        delete s.screen;
        delete s.editScreen;
        facts.search = s;
        save();

        // 4. the full list
        const list = await H.fullList(page, m);
        record('03-full-list', list.screen);
        facts.count = list.count;
        facts.sentListed = H.SENT.filter((n) => list.names.includes(n));
        facts.sentMissing = H.SENT.filter((n) => !list.names.includes(n));
        facts.neverSentListed = H.NEVER.filter((n) => list.names.includes(n));
        facts.names = list.names;
        save();

        // 5–6. invite ccorino and read the email
        const role = A5.CASES[app.name].role;
        const to = A5.CASES[app.name].accepts.email;
        const sent = await A5.sendInvitation(page, app, {email: to, role});
        record('04-invitation-sent', sent.screen);
        facts.sent = {role, text: sent.text};
        const mail = await A5.invitationMail(app, to, since);
        facts.mail = {subject: mail.subject, from: mail.from};
        facts.mailSubjectIsTemplate = s.subject ? s.subject === mail.subject : null;
        await signOut(page);
        facts.serverErrors = log.since(mark);
        save();
    } catch (e) {
        facts.error = H.flat(e.message, 600);
        save();
        throw e;
    } finally {
        console.log(JSON.stringify({app: facts.app, line: facts.line, count: facts.count, search: facts.search && {rows: facts.search.rows.map((r) => r.name), noItems: facts.search.noItems, opens: facts.search.opens, subject: facts.search.subject}, sentMissing: facts.sentMissing, sentListed: facts.sentListed, neverSentListed: facts.neverSentListed, mail: facts.mail, error: facts.error}));
        await close();
    }
});
