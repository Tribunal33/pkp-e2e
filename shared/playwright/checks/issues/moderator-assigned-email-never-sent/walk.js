// U35 OPS3 walk (issue report docs/issues/U35-OPS3-moderator-assigned-email-never-sent.md).
// On PKP's default test dataset: the manager rvaca opens "Moderator Assigned (Auto)" (a journal's
// or press's "Editor Assigned (Auto)") under Settings › Workflow › Emails; the dataset's author
// (ccorino, OMP aclark) submits, then rvaca submits; rvaca reads each submission's
// "Participants" and "Activity Log", and the mailboxes are read for "You have been assigned as
// a moderator (an editor) on a submission to …".
// The neighbour check is in the same walk: OJS and OMP are the control (their editors get the
// email with and without the fix), and the counts per mailbox show who must get none (the
// author, an unassigned manager) and that nobody gets two.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/moderator-assigned-email-never-sent/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('./lib.js');

const BOXES = ['dbarnes', 'dbuskins', 'sberardo', 'minoue', 'rvaca'];

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    const run = tag('u35r6');
    const facts = {app: app.name, line: app.line || 'main', run};
    const {page, close} = await launch(app);
    try {
        // 1. the email is listed and opens for editing
        await signIn(page, 'rvaca');
        facts.email = await H.openAutoEmail(page, app).catch((e) => ({error: e.message.split('\n')[0]}));
        record('01-email', await screen(page));
        await signOut(page);

        // 2. the author submits; 3. the manager submits
        const tAu = `${run} author`;
        const au = await H.submitAs(page, app, w.author, tAu);
        record('02-author-complete', au.screen);
        const tMg = `${run} manager`;
        const mg = await H.submitAs(page, app, 'rvaca', tMg);
        record('03-manager-complete', mg.screen);
        facts.author = {id: au.id, title: tAu, problems: au.problems};
        facts.manager = {id: mg.id, title: tMg, problems: mg.problems};

        // 5. mail: the author's acknowledgement (sent by the same "Submit") bounds the wait
        facts.author.ack = (await H.waitMail(page, app, `${w.author}@mailinator.com`, tAu, 45_000)).map((m) => m.subject);
        await H.waitMail(page, app, 'dbuskins@mailinator.com', tMg, app.name === 'ops' ? 6_000 : 30_000);
        facts.author.mail = await H.assignedMail(app, [...BOXES, w.author], tAu);
        facts.manager.mail = await H.assignedMail(app, [...BOXES, w.author], tMg);

        // 4. the manager reads each submission
        await signIn(page, 'rvaca');
        Object.assign(facts.author, await H.readSubmission(page, app, au.id));
        record('04-author-workflow', await screen(page));
        Object.assign(facts.manager, await H.readSubmission(page, app, mg.id));
        record('05-manager-workflow', await screen(page));
        await signOut(page);

        const count = (mail) => Object.fromEntries(Object.entries(mail).map(([u, s]) => [u, s.filter((x) => w.subject.test(x)).length]));
        const logged = (log) => log.filter((r) => /You have been assigned as/.test(r)).length;
        facts.observed = {
            emailListed: facts.email.name, emailSubject: facts.email.subject,
            author: {participants: facts.author.participants, assignedMail: count(facts.author.mail), logged: logged(facts.author.log), otherMail: facts.author.mail},
            manager: {participants: facts.manager.participants, assignedMail: count(facts.manager.mail), logged: logged(facts.manager.log), otherMail: facts.manager.mail},
        };
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
