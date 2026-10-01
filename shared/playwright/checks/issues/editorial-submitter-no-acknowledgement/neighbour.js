// Neighbour check of the U21 A7 / OPS5 acknowledgement fix (issue report
// docs/issues/U21-A7-OPS5-editorial-submitter-no-acknowledgement.md): rvaca sets "Submission
// Confirmation" to "Do not send an email."; dbarnes submits under his editorial role. The
// setting must still rule: no acknowledgement to dbarnes. Walked with the fix in and out.
//   PROBE_FEATURE=issues-ir28 PROBE_AGENT=ir28 node bin/probe.js all shared/playwright/checks/issues/editorial-submitter-no-acknowledgement/neighbour.js
const {forEachApp, launch, record, tag} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const run = tag('u21ir28');
    const facts = {app: app.name, line: app.line || 'main', run};
    const {page, close} = await launch(app);
    try {
        facts.setting = await H.setConfirmation(page, app, 'Do not send an email.');
        const t = `${run} editor off`;
        const ed = await H.submitAs(page, app, 'dbarnes', t);
        record('n1-editor-off-complete', ed.screen);
        facts.editor = {id: ed.id, title: t, problems: ed.problems, complete: ed.complete};
        // dbarnes's assignment mail (OJS, OMP) bounds the wait where it comes; OPS waits the span
        facts.editor.mail = await H.waitMail(page, app, 'dbarnes@mailinator.com', t, 20_000);
        facts.observed = {editorOffAcks: H.acks(facts.editor.mail).map((m) => m.subject), editorOffOtherMail: facts.editor.mail.map((m) => m.subject)};
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
