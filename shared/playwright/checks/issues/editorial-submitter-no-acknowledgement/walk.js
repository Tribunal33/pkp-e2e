// U21 A7 (second half) and OPS5 walk (issue report
// docs/issues/U21-A7-OPS5-editorial-submitter-no-acknowledgement.md).
// On PKP's default test dataset, "Submission Confirmation" at its default ("Send an email to
// all authors."): dbarnes (Journal editor, Press editor, Preprint Server manager: an editorial
// role) submits; then, as the control, the dataset's author ccorino (OMP aclark) submits.
// Both mailboxes are read for the acknowledgement, and, as dbarnes, each submission's
// "Activity Log" for the emails it records.
//   PROBE_FEATURE=issues-ir28 PROBE_AGENT=ir28 node bin/probe.js all shared/playwright/checks/issues/editorial-submitter-no-acknowledgement/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    const run = tag('u21ir28');
    const facts = {app: app.name, line: app.line || 'main', run};
    const {page, close} = await launch(app);
    try {
        // 1-2. dbarnes submits under his editorial role
        const tEd = `${run} editor`;
        const ed = await H.submitAs(page, app, 'dbarnes', tEd);
        record('01-editor-complete', ed.screen);
        facts.editor = {id: ed.id, title: tEd, problems: ed.problems, complete: ed.complete, claim: H.emailClaim(ed.complete)};
        // 3. the control: the author submits
        const tAu = `${run} author`;
        const au = await H.submitAs(page, app, w.author, tAu);
        record('02-author-complete', au.screen);
        facts.author = {id: au.id, title: tAu, problems: au.problems, complete: au.complete, claim: H.emailClaim(au.complete)};
        // 4. mailboxes: the author's acknowledgement bounds the wait for dbarnes's (sent first)
        facts.author.mail = await H.waitMail(page, app, `${w.author}@mailinator.com`, tAu, 45_000);
        facts.editor.mail = await H.waitMail(page, app, 'dbarnes@mailinator.com', tEd, 5_000);
        // 5. as dbarnes, each submission's "Activity Log"
        await signIn(page, 'dbarnes');
        facts.editor.activityLog = await H.activityLogEmails(page, app, ed.id);
        facts.author.activityLog = await H.activityLogEmails(page, app, au.id);
        record('03-activity-log', await screen(page));
        await signOut(page);
        facts.observed = {
            editorAcks: H.acks(facts.editor.mail).map((m) => m.subject),
            editorOtherMail: facts.editor.mail.filter((m) => !H.acks([m]).length).map((m) => m.subject),
            editorScreenClaim: facts.editor.claim,
            authorAcks: H.acks(facts.author.mail).map((m) => m.subject),
            authorScreenClaim: facts.author.claim,
            editorActivityLogEmails: facts.editor.activityLog,
            authorActivityLogEmails: facts.author.activityLog,
        };
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
