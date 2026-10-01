// U21 A8 walk (issue report docs/issues/U21-A8-section-editors-not-assigned-second-journal.md).
// On PKP's default test dataset: the Site Administrator creates a second journal (press,
// server) on screen, gives dbuskins its Section editor (Series editor, Moderator) role and an
// author its Author role, and ticks dbuskins under the section's (a new series')
// "Editorial Assignments". The author submits to it; then, as the control, the same author
// submits to the dataset's own journal, whose sections already assign editors. The admin reads
// both submissions' "Participants" and the mailbox is read for the assignment email and the
// "needs an editor" email.
//   PROBE_FEATURE=issues-ir25 PROBE_AGENT=ir25 node bin/probe.js all shared/playwright/checks/issues/section-editors-not-assigned-second-journal/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('./lib.js');

const CTX = 'u21ir25';

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    const run = tag('u21ir25');
    const name = `Second ${w.noun} u21ir25`;
    const facts = {app: app.name, line: app.line || 'main', run, steps: {}};
    const {page, close} = await launch(app);
    try {
        // 1-2. admin creates the second context
        await signIn(page, 'admin');
        facts.steps.create = await H.createContext(page, app, {name, initials: 'SJU', path: CTX, email: 'u21ir25@mailinator.com'});
        record('01-created', await screen(page));
        // 3-4. roles in the new context, from its Settings wizard
        facts.steps.editorRole = await H.giveRole(page, app, {username: 'dbuskins', role: w.se});
        facts.steps.authorRole = await H.giveRole(page, app, {username: w.author, role: 'Author'});
        record('02-roles', await screen(page));
        // 5. the section's (a new series') "Editorial Assignments"
        facts.steps.section = await H.assignEditorToSection(page, app, CTX, {editorName: 'David Buskins', seriesTitle: 'u21ir25 Series', seriesPath: 'u21ir25s'});
        record('03-section', await screen(page));
        await signOut(page);

        // 6. the author submits to the second context
        await signIn(page, w.author);
        const t2 = `${run} second ${w.noun.toLowerCase()}`;
        const id2 = await H.beginSubmission(page, app, CTX, {title: t2, section: w.section});
        facts.steps.second = {id: id2, title: t2, problems: await H.completeSubmission(page, app, CTX, id2, {series: 'u21ir25 Series'})};
        record('04-second-submitted', await screen(page));
        // 9. control: the same author submits to the dataset's own context
        const t1 = `${run} first ${w.noun.toLowerCase()}`;
        const id1 = await H.beginSubmission(page, app, app.contextPath, {title: t1, section: w.controlSection});
        facts.steps.first = {id: id1, title: t1, problems: await H.completeSubmission(page, app, app.contextPath, id1, {series: w.controlSection})};
        record('05-first-submitted', await screen(page));
        await signOut(page);

        // 7, 10. the admin reads each submission's "Participants"
        await signIn(page, 'admin');
        const wf2 = await H.openWorkflow(page, app, CTX, id2);
        record('06-second-workflow', await screen(page));
        const wf1 = await H.openWorkflow(page, app, app.contextPath, id1);
        record('07-first-workflow', await screen(page));
        facts.second = {participants: H.participantsPart(wf2), dbuskinsListed: /David Buskins/.test(H.participantsPart(wf2) || '')};
        facts.first = {participants: H.participantsPart(wf1), dbuskinsListed: /David Buskins/.test(H.participantsPart(wf1) || '')};
        await signOut(page);

        // 8. mail (the dataset runs jobs on web requests; wait for the managers' or editors' mail first)
        const needs = (t) => H.mailFor(app, 'pkpadmin@mailinator.com', t, {wait: 20_000});
        facts.second.mail = {
            admin: await needs(t2),
            dbuskins: await H.mailFor(app, 'dbuskins@mailinator.com', t2),
        };
        facts.first.mail = {
            admin: await H.mailFor(app, 'pkpadmin@mailinator.com', t1),
            dbuskins: await H.mailFor(app, 'dbuskins@mailinator.com', t1, {wait: app.name === 'ops' ? 0 : 20_000}),
        };
        facts.observed = {
            secondAssigned: facts.second.dbuskinsListed,
            secondNeedsEditorMail: facts.second.mail.admin.some((m) => /needs an editor/i.test(m.subject)),
            secondAssignedMail: facts.second.mail.dbuskins.length,
            firstAssigned: facts.first.dbuskinsListed,
            firstNeedsEditorMail: facts.first.mail.admin.some((m) => /needs an editor/i.test(m.subject)),
            firstAssignedMail: facts.first.mail.dbuskins.length,
        };
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
