// U21 A8 neighbour check (issue report docs/issues/U21-A8-section-editors-not-assigned-second-journal.md):
// the path the fix must leave alone. On PKP's default test dataset the Site Administrator creates
// the second journal (press, server) and gives dbuskins its Section editor (Series editor,
// Moderator) role and an author the Author role, but ticks nobody under "Editorial Assignments"
// (OMP: the author picks no series). The author submits; nobody may be assigned and the
// managers must get the "needs an editor" email, with or without the fix.
//   PROBE_FEATURE=issues-ir25 PROBE_AGENT=ir25 PROBE_RUN=nb node bin/probe.js all shared/playwright/checks/issues/section-editors-not-assigned-second-journal/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('./lib.js');

const CTX = 'u21ir25';

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    const run = tag('u21ir25nb');
    const facts = {app: app.name, line: app.line || 'main', run, steps: {}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        facts.steps.create = await H.createContext(page, app, {name: `Second ${w.noun} u21ir25`, initials: 'SJU', path: CTX, email: 'u21ir25@mailinator.com'});
        facts.steps.editorRole = await H.giveRole(page, app, {username: 'dbuskins', role: w.se});
        facts.steps.authorRole = await H.giveRole(page, app, {username: w.author, role: 'Author'});
        await signOut(page);
        await signIn(page, w.author);
        const t = `${run} unassigned section`;
        const id = await H.beginSubmission(page, app, CTX, {title: t, section: w.section});
        facts.steps.submission = {id, title: t, problems: await H.completeSubmission(page, app, CTX, id, {series: null})};
        await signOut(page);
        await signIn(page, 'admin');
        const wf = await H.openWorkflow(page, app, CTX, id);
        record('nb-workflow', await screen(page));
        facts.participants = H.participantsPart(wf);
        facts.mail = {
            admin: await H.mailFor(app, 'pkpadmin@mailinator.com', t, {wait: 20_000}),
            dbuskins: await H.mailFor(app, 'dbuskins@mailinator.com', t),
        };
        facts.observed = {
            dbuskinsAssigned: /David Buskins/.test(facts.participants || ''),
            needsEditorMail: facts.mail.admin.some((m) => /needs an editor/i.test(m.subject)),
            assignedMail: facts.mail.dbuskins.length,
        };
    } finally {
        record('nb-facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
