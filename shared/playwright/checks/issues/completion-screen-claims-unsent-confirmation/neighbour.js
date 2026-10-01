// Neighbour check of the U21 A7 completion-screen fix (issue report
// docs/issues/U21-A7-completion-screen-claims-unsent-confirmation.md): with "Submission
// Confirmation" at its default, the author ccorino (OMP aclark) submits; the completion screen
// must keep its "emailed a confirmation" sentence, and the acknowledgement must arrive.
// Walked with the fix in and out.
//   PROBE_FEATURE=issues-ir28 PROBE_AGENT=ir28 node bin/probe.js all shared/playwright/checks/issues/completion-screen-claims-unsent-confirmation/neighbour.js
const {forEachApp, launch, record, tag} = require('../../../probe');
const H = require('../editorial-submitter-no-acknowledgement/lib.js');

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    const run = tag('u21ir28');
    const facts = {app: app.name, line: app.line || 'main', run};
    const {page, close} = await launch(app);
    try {
        const t = `${run} author on`;
        const au = await H.submitAs(page, app, w.author, t);
        record('n1-author-on-complete', au.screen);
        facts.author = {id: au.id, title: t, problems: au.problems, complete: au.complete};
        facts.author.mail = await H.waitMail(page, app, `${w.author}@mailinator.com`, t, 45_000);
        facts.observed = {authorOnScreenClaim: H.emailClaim(au.complete), authorOnAcks: H.acks(facts.author.mail).map((m) => m.subject)};
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
