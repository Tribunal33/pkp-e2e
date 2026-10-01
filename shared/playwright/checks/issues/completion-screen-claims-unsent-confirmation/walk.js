// U21 A7 walk (issue report docs/issues/U21-A7-completion-screen-claims-unsent-confirmation.md).
// On PKP's default test dataset:
//   Editor submitting: dbarnes (an editorial role) submits with "Submission Confirmation" at
//   its default; the completion screen and his mailbox are read.
//   Confirmation turned off: rvaca sets "Do not send an email."; the author ccorino (OMP
//   aclark) submits; the completion screen and the author's mailbox are read.
//   Then rvaca reads each submission's "Activity Log" for the emails it records.
//   PROBE_FEATURE=issues-ir28 PROBE_AGENT=ir28 node bin/probe.js all shared/playwright/checks/issues/completion-screen-claims-unsent-confirmation/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('../editorial-submitter-no-acknowledgement/lib.js');

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    const run = tag('u21ir28');
    const facts = {app: app.name, line: app.line || 'main', run};
    const {page, close} = await launch(app);
    try {
        // Editor submitting (1-3)
        const tEd = `${run} editor`;
        const ed = await H.submitAs(page, app, 'dbarnes', tEd);
        record('01-editor-complete', ed.screen);
        facts.editor = {id: ed.id, title: tEd, problems: ed.problems, complete: ed.complete, claim: H.emailClaim(ed.complete)};
        // Confirmation turned off (4-5)
        facts.setting = await H.setConfirmation(page, app, 'Do not send an email.');
        const tAu = `${run} author off`;
        const au = await H.submitAs(page, app, w.author, tAu);
        record('02-author-off-complete', au.screen);
        facts.author = {id: au.id, title: tAu, problems: au.problems, complete: au.complete, claim: H.emailClaim(au.complete)};
        // Mailboxes: dbarnes's needs-an-editor or assignment mail is not a bound on every app,
        // so wait on the author's box the full span, then read dbarnes's.
        facts.author.mail = await H.waitMail(page, app, `${w.author}@mailinator.com`, tAu, 30_000);
        facts.editor.mail = await H.waitMail(page, app, 'dbarnes@mailinator.com', tEd, 3_000);
        // 6. as rvaca, each submission's "Activity Log"
        await signIn(page, 'rvaca');
        facts.editor.activityLog = await H.activityLogEmails(page, app, ed.id);
        facts.author.activityLog = await H.activityLogEmails(page, app, au.id);
        record('03-activity-log', await screen(page));
        await signOut(page);
        facts.observed = {
            editorScreenClaim: facts.editor.claim,
            editorAcks: H.acks(facts.editor.mail).map((m) => m.subject),
            authorOffScreenClaim: facts.author.claim,
            authorOffAcks: H.acks(facts.author.mail).map((m) => m.subject),
            editorActivityLogEmails: facts.editor.activityLog,
            authorOffActivityLogEmails: facts.author.activityLog,
        };
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
